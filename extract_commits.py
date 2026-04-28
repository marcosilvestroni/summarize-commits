#!/usr/bin/env python3
"""
Extract commits from Git repositories and generate CSV files.
Optionally detects technologies used in each repo and saves a tech report.

This script scans for Git repositories and extracts commit history,
saving the data to CSV files in a configurable output directory.

Usage:
    python3 extract_commits.py [--output <directory>] [--repo <path>] [--all]
    python3 extract_commits.py --tech          # only extract technologies
    python3 extract_commits.py --all-features  # extract commits + technologies
    
Examples:
    # Extract from all repos in current directory
    python3 extract_commits.py
    
    # Extract from all repos in specific directory
    python3 extract_commits.py --output ./commits --all
    
    # Extract from specific repository
    python3 extract_commits.py --repo /path/to/repo
"""

import argparse
import csv
import json
import os
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Optional, List, Dict, Any, Set


class GitCommitExtractor:
    """Extract commits from Git repositories."""
    
    # Default author emails/usernames to include
    DEFAULT_AUTHORS = [
        'silvestronimarco@gmail.com',
        'marco.silvestroni@accenture.com',
        'marco.sivestroni@external.stellantis.com',
        'sd21107',
        'omni-msilvetroni'
    ]
    
    def __init__(self, output_dir: Optional[str] = None, author_filter: Optional[List[str]] = None):
        """
        Initialize the extractor.
        
        Args:
            output_dir: Directory where CSV files will be saved.
                       Defaults to './commits' relative to script location.
            author_filter: List of email addresses or usernames to filter commits.
                          If None, extracts all commits regardless of author.
        """
        if output_dir is None:
            # Get script directory and use 'commits' folder relative to it
            script_dir = Path(__file__).parent.resolve()
            output_dir = script_dir / "commits"
        else:
            output_dir = Path(output_dir)
        
        self.output_dir = output_dir
        self.author_filter = author_filter
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------ #
    # Technology detection                                                 #
    # ------------------------------------------------------------------ #

    # Extension → language mapping
    EXTENSION_LANGUAGES: Dict[str, str] = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript',
        '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
        '.py': 'Python',
        '.java': 'Java',
        '.kt': 'Kotlin', '.kts': 'Kotlin',
        '.go': 'Go',
        '.rs': 'Rust',
        '.cs': 'C#',
        '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
        '.c': 'C',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.swift': 'Swift',
        '.dart': 'Dart',
        '.scala': 'Scala',
        '.html': 'HTML',
        '.css': 'CSS', '.scss': 'SCSS', '.sass': 'SASS', '.less': 'LESS',
        '.sql': 'SQL',
        '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
        '.yaml': 'YAML', '.yml': 'YAML',
        '.json': 'JSON',
        '.tf': 'Terraform',
    }

    # Indicator files → framework/tool/category mapping
    INDICATOR_FILES: Dict[str, Dict[str, List[str]]] = {
        'package.json': {},       # handled separately
        'requirements.txt': {'tools': ['pip']},
        'Pipfile': {'tools': ['pipenv']},
        'pyproject.toml': {'tools': ['poetry/pyproject']},
        'setup.py': {'tools': ['setuptools']},
        'Cargo.toml': {'frameworks': ['Rust/Cargo']},
        'go.mod': {'tools': ['Go Modules']},
        'pom.xml': {'frameworks': ['Maven']},
        'build.gradle': {'frameworks': ['Gradle']},
        'Gemfile': {'frameworks': ['Ruby/Bundler']},
        'composer.json': {'tools': ['Composer']},
        'Dockerfile': {'tools': ['Docker']},
        'docker-compose.yml': {'tools': ['Docker Compose']},
        'docker-compose.yaml': {'tools': ['Docker Compose']},
        '.github/workflows': {'tools': ['GitHub Actions']},  # directory check
        'Makefile': {'tools': ['Make']},
        'terraform.tf': {'tools': ['Terraform']},
        'angular.json': {'frameworks': ['Angular']},
        'next.config.js': {'frameworks': ['Next.js']},
        'next.config.ts': {'frameworks': ['Next.js']},
        'nuxt.config.ts': {'frameworks': ['Nuxt.js']},
        'nuxt.config.js': {'frameworks': ['Nuxt.js']},
        'svelte.config.js': {'frameworks': ['Svelte']},
        'gatsby-config.js': {'frameworks': ['Gatsby']},
        'remix.config.js': {'frameworks': ['Remix']},
        'vite.config.ts': {'tools': ['Vite']},
        'vite.config.js': {'tools': ['Vite']},
        'webpack.config.js': {'tools': ['Webpack']},
        'rollup.config.js': {'tools': ['Rollup']},
        'jest.config.js': {'tools': ['Jest']},
        'jest.config.ts': {'tools': ['Jest']},
        'vitest.config.ts': {'tools': ['Vitest']},
        '.eslintrc': {'tools': ['ESLint']},
        '.eslintrc.js': {'tools': ['ESLint']},
        '.eslintrc.json': {'tools': ['ESLint']},
        'eslint.config.js': {'tools': ['ESLint']},
        '.prettierrc': {'tools': ['Prettier']},
        'prettier.config.js': {'tools': ['Prettier']},
        'tailwind.config.js': {'frameworks': ['TailwindCSS']},
        'tailwind.config.ts': {'frameworks': ['TailwindCSS']},
    }

    # npm package name → framework  
    KNOWN_NPM_FRAMEWORKS: Dict[str, str] = {
        'react': 'React', 'react-dom': 'React',
        'vue': 'Vue.js', '@vue/core': 'Vue.js',
        'svelte': 'Svelte',
        '@angular/core': 'Angular',
        'next': 'Next.js',
        'nuxt': 'Nuxt.js',
        'gatsby': 'Gatsby',
        'remix': 'Remix',
        'express': 'Express',
        'fastify': 'Fastify',
        'koa': 'Koa',
        'hapi': 'Hapi',
        'nestjs': 'NestJS', '@nestjs/core': 'NestJS',
        'graphql': 'GraphQL',
        '@apollo/client': 'Apollo',
        'redux': 'Redux', '@reduxjs/toolkit': 'Redux Toolkit',
        'mobx': 'MobX',
        'zustand': 'Zustand',
        'typeorm': 'TypeORM',
        'prisma': 'Prisma',
        'mongoose': 'Mongoose',
        'sequelize': 'Sequelize',
        'socket.io': 'Socket.IO',
        'electron': 'Electron',
        'tailwindcss': 'TailwindCSS',
        'styled-components': 'Styled Components',
        '@emotion/react': 'Emotion',
        'three': 'Three.js',
        'd3': 'D3.js',
        'jest': 'Jest',
        'vitest': 'Vitest',
        '@testing-library/react': 'Testing Library',
        'playwright': 'Playwright',
        'cypress': 'Cypress',
        'storybook': 'Storybook', '@storybook/react': 'Storybook',
        'vite': 'Vite',
        'webpack': 'Webpack',
        'typescript': 'TypeScript',
        'eslint': 'ESLint',
        'prettier': 'Prettier',
    }

    # pip package → framework
    KNOWN_PIP_FRAMEWORKS: Dict[str, str] = {
        'django': 'Django',
        'flask': 'Flask',
        'fastapi': 'FastAPI',
        'tornado': 'Tornado',
        'sqlalchemy': 'SQLAlchemy',
        'celery': 'Celery',
        'pytest': 'pytest',
        'numpy': 'NumPy',
        'pandas': 'Pandas',
        'scikit-learn': 'Scikit-learn',
        'tensorflow': 'TensorFlow',
        'torch': 'PyTorch',
        'pydantic': 'Pydantic',
    }

    def detect_technologies(
        self, repo_path: Path
    ) -> Dict[str, Any]:
        """
        Detect technologies, languages, frameworks and tools used in a repo.

        Returns a dict with keys: project, detectedAt, languages,
        frameworks, tools.
        """
        languages: Set[str] = set()
        frameworks: Set[str] = set()
        tools: Set[str] = set()

        # --- 1. Language detection via git ls-files ---
        try:
            result = subprocess.run(
                ['git', '-C', str(repo_path), 'ls-files'],
                capture_output=True, text=True, check=False
            )
            if result.returncode == 0:
                for filepath in result.stdout.splitlines():
                    ext = Path(filepath).suffix.lower()
                    if ext in self.EXTENSION_LANGUAGES:
                        languages.add(self.EXTENSION_LANGUAGES[ext])
        except Exception as e:
            print(f'  Warning: could not run git ls-files on {repo_path}: {e}',
                  file=sys.stderr)

        # --- 2. Indicator file scanning ---
        for indicator, categories in self.INDICATOR_FILES.items():
            indicator_path = repo_path / indicator
            if indicator_path.exists():
                for cat, items in categories.items():
                    if cat == 'frameworks':
                        frameworks.update(items)
                    elif cat == 'tools':
                        tools.update(items)

        # --- 3. package.json analysis ---
        pkg_path = repo_path / 'package.json'
        if pkg_path.exists():
            try:
                with open(pkg_path, 'r', encoding='utf-8') as f:
                    pkg = json.load(f)
                all_deps = {}
                all_deps.update(pkg.get('dependencies', {}))
                all_deps.update(pkg.get('devDependencies', {}))
                for pkg_name in all_deps:
                    name_lc = pkg_name.lower()
                    for known, label in self.KNOWN_NPM_FRAMEWORKS.items():
                        if known == name_lc or name_lc.startswith(known + '/'):
                            frameworks.add(label)
                            break
            except Exception as e:
                print(f'  Warning: could not parse package.json in {repo_path}: {e}',
                      file=sys.stderr)

        # --- 4. requirements.txt analysis ---
        req_path = repo_path / 'requirements.txt'
        if req_path.exists():
            try:
                with open(req_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        pkg_name = line.strip().split('==')[0].split('>=')[0].split('[')[0].lower()
                        if pkg_name in self.KNOWN_PIP_FRAMEWORKS:
                            frameworks.add(self.KNOWN_PIP_FRAMEWORKS[pkg_name])
            except Exception as e:
                print(f'  Warning: could not parse requirements.txt in {repo_path}: {e}',
                      file=sys.stderr)

        # Promote TypeScript from languages to frameworks if found AND TS config exists
        if 'TypeScript' in languages and (repo_path / 'tsconfig.json').exists():
            # Keep it in languages (it IS a language)
            pass

        return {
            'project': self.get_repo_name(repo_path),
            'detectedAt': date.today().isoformat(),
            'languages': sorted(languages),
            'frameworks': sorted(frameworks - languages),  # avoid duplication
            'tools': sorted(tools),
        }

    def save_tech_report(self, tech_data: Dict[str, Any]) -> None:
        """Save technology report to a JSON file."""
        output_file = self.output_dir / f"tech_report_{tech_data['project']}.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(tech_data, f, indent=2, ensure_ascii=False)
            project = tech_data['project']
            langs = ', '.join(tech_data['languages']) or 'none'
            fws = ', '.join(tech_data['frameworks']) or 'none'
            print(f'✓ Tech report saved for {project}')
            print(f'  Languages : {langs}')
            print(f'  Frameworks: {fws}')
        except Exception as e:
            print(f'Error saving tech report: {e}', file=sys.stderr)

    def extract_tech_from_repo(self, repo_path: Path) -> bool:
        """Detect technologies and save report for a single repository."""
        if not self.is_git_repo(repo_path):
            return False
        print(f'Detecting technologies in: {repo_path.name}')
        tech_data = self.detect_technologies(repo_path)
        self.save_tech_report(tech_data)
        return True
    
    def is_git_repo(self, path: Path) -> bool:
        """Check if a directory is a Git repository."""
        try:
            subprocess.run(
                ["git", "-C", str(path), "rev-parse", "--git-dir"],
                capture_output=True,
                check=True
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def get_repo_name(self, repo_path: Path) -> str:
        """Extract repository name from path."""
        return repo_path.name.lower().replace("-", "_").replace(" ", "_")
    
    def extract_commits(self, repo_path: Path) -> List[Dict[str, Any]]:
        """
        Extract commits from a repository.
        
        Args:
            repo_path: Path to the Git repository.
            
        Returns:
            List of dictionaries containing commit information.
        """
        try:
            # Get commits with format: date|timestamp|author|email|hash|subject
            cmd = [
                "git",
                "-C", str(repo_path),
                "log",
                "--pretty=format:%ad|%aI|%an|%ae|%H|%s",
                "--date=short"
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                print(f"Warning: Could not extract commits from {repo_path}", file=sys.stderr)
                return []
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                
                try:
                    parts = line.split('|')
                    if len(parts) >= 6:
                        email = parts[3].strip()
                        author = parts[2].strip()
                        
                        # Filter by author if specified
                        if self.author_filter:
                            # Check if email or username matches any filter criteria
                            if not any(
                                filter_term.lower() in email.lower() or 
                                filter_term.lower() in author.lower()
                                for filter_term in self.author_filter
                            ):
                                continue  # Skip this commit
                        
                        commit = {
                            'Date': parts[0],
                            'Timestamp': parts[1],
                            'Author': author,
                            'Email': email,
                            'Hash': parts[4],
                            'Subject': parts[5],
                        }
                        commits.append(commit)
                except (IndexError, ValueError):
                    continue
            
            return commits
        
        except Exception as e:
            print(f"Error extracting commits from {repo_path}: {e}", file=sys.stderr)
            return []
    
    def get_commit_stats(self, repo_path: Path, commit_hash: str) -> tuple:
        """
        Get additions and deletions for a commit.
        
        Args:
            repo_path: Path to the Git repository.
            commit_hash: Commit hash.
            
        Returns:
            Tuple of (additions, deletions).
        """
        try:
            cmd = [
                "git",
                "-C", str(repo_path),
                "show",
                "--stat=1000",
                "--format=",
                commit_hash
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                return (0, 0)
            
            additions = 0
            deletions = 0
            
            for line in result.stdout.split('\n'):
                if '+' in line or '-' in line:
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if part == '+' and i > 0:
                            try:
                                additions += int(parts[i - 1])
                            except ValueError:
                                pass
                        elif part == '-' and i > 0:
                            try:
                                deletions += int(parts[i - 1])
                            except ValueError:
                                pass
            
            return (additions, deletions)
        
        except Exception:
            return (0, 0)
    
    def save_to_csv(self, commits: List[Dict[str, Any]], repo_name: str) -> None:
        """
        Save commits to a CSV file.
        
        Args:
            commits: List of commit dictionaries.
            repo_name: Name of the repository (used for filename).
        """
        if not commits:
            print(f"No commits to save for {repo_name}")
            return
        
        output_file = self.output_dir / f"contributions_report_{repo_name}.csv"
        
        fieldnames = ['Date', 'Timestamp', 'Author', 'Email', 'Hash', 'Subject', 'Additions', 'Deletions']
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(commits)
            
            print(f"✓ Saved {len(commits)} commits to {output_file}")
        
        except Exception as e:
            print(f"Error saving CSV for {repo_name}: {e}", file=sys.stderr)
    
    def extract_from_repo(self, repo_path: Path) -> bool:
        """
        Extract commits from a single repository.
        
        Args:
            repo_path: Path to the repository.
            
        Returns:
            True if successful, False otherwise.
        """
        if not self.is_git_repo(repo_path):
            return False
        
        repo_name = self.get_repo_name(repo_path)
        filter_info = ""
        if self.author_filter:
            filter_info = f" (filtering by: {', '.join(self.author_filter)})"
        print(f"Extracting commits from: {repo_path.name}{filter_info}")
        
        commits = self.extract_commits(repo_path)
        
        if commits:
            # Get stats for each commit
            for commit in commits:
                additions, deletions = self.get_commit_stats(
                    repo_path,
                    commit['Hash']
                )
                commit['Additions'] = additions
                commit['Deletions'] = deletions
            
            self.save_to_csv(commits, repo_name)
            return True
        
        return False
    
    def extract_from_directory(self, search_dir: Optional[Path] = None) -> int:
        """
        Search for Git repositories and extract commits from all of them.
        
        Args:
            search_dir: Directory to search in. Defaults to current directory.
            
        Returns:
            Number of repositories processed.
        """
        if search_dir is None:
            search_dir = Path.cwd()
        else:
            search_dir = Path(search_dir)
        
        if not search_dir.exists():
            print(f"Error: Directory does not exist: {search_dir}", file=sys.stderr)
            return 0
        
        print(f"Searching for Git repositories in: {search_dir}")
        
        repos_found = 0
        
        # Search for .git directories
        for git_dir in search_dir.rglob('.git'):
            repo_path = git_dir.parent
            
            # Skip if it's a submodule or already processed
            if repo_path.name.startswith('.'):
                continue
            
            if self.extract_from_repo(repo_path):
                repos_found += 1
        
        return repos_found


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Extract commits from Git repositories and generate CSV files.\n'
                    'Optionally detects technologies used in each repository.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract commits from all repos in current directory
  python3 extract_commits.py

  # Extract to custom output directory
  python3 extract_commits.py --output ./my_commits

  # Extract from specific repository
  python3 extract_commits.py --repo /path/to/repo

  # Search in specific directory for all repos
  python3 extract_commits.py --search /path/to/search

  # Only extract technology data (no commits)
  python3 extract_commits.py --repo /path/to/repo --tech

  # Extract both commits and technology data
  python3 extract_commits.py --all-features
        """
    )

    parser.add_argument(
        '--output', '-o',
        help='Output directory for CSV/JSON files (default: ./commits)',
        default=None
    )

    parser.add_argument(
        '--repo', '-r',
        help='Extract from specific repository',
        default=None
    )

    parser.add_argument(
        '--search', '-s',
        help='Search for repositories in this directory',
        default=None
    )

    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Search in subdirectories recursively'
    )

    parser.add_argument(
        '--my-commits', '-m',
        action='store_true',
        help='Filter commits by default authors: silvestronimarco@gmail.com, marco.silvestroni@accenture.com, '
             'marco.sivestroni@external.stellantis.com, sd21107'
    )

    parser.add_argument(
        '--author',
        type=str,
        nargs='+',
        help='Filter commits by email or username (can specify multiple)',
        default=None
    )

    parser.add_argument(
        '--tech', '-t',
        action='store_true',
        help='Detect and save technology data for each repository (generates tech_report_<repo>.json)'
    )

    parser.add_argument(
        '--all-features',
        action='store_true',
        help='Extract both commit history AND technology data'
    )
    
    args = parser.parse_args()

    try:
        # Determine author filter
        author_filter = GitCommitExtractor.DEFAULT_AUTHORS

        if args.author:
            author_filter = args.author
            print(f"📧 Filtering commits by authors: {', '.join(author_filter)}\n")
        else:
            print(f"📧 Filtering commits by authors: {', '.join(author_filter)}\n")

        extractor = GitCommitExtractor(output_dir=args.output, author_filter=author_filter)

        # Determine what to run
        do_commits = not args.tech or args.all_features
        do_tech = args.tech or args.all_features

        if args.repo:
            repo_path = Path(args.repo).resolve()
            print(f"Processing repository: {repo_path}")
            success = False
            if do_commits:
                success = extractor.extract_from_repo(repo_path)
            if do_tech:
                success = extractor.extract_tech_from_repo(repo_path) or success
            sys.exit(0 if success else 1)

        elif args.search or args.all:
            search_dir = Path(args.search or '.').resolve()
            repos_processed = 0
            if do_commits:
                repos_processed = extractor.extract_from_directory(search_dir)
            if do_tech:
                # Scan for repos and run tech detection
                for git_dir in search_dir.rglob('.git'):
                    repo_path = git_dir.parent
                    if not repo_path.name.startswith('.'):
                        success = extractor.extract_tech_from_repo(repo_path)
                        if success and not do_commits:
                            repos_processed += 1
            print(f"\nProcessed {repos_processed} repositories")
            sys.exit(0 if repos_processed > 0 else 1)

        else:
            # Default: search in current directory
            repos_processed = 0
            if do_commits:
                repos_processed = extractor.extract_from_directory(Path.cwd())
            if do_tech:
                for git_dir in Path.cwd().rglob('.git'):
                    repo_path = git_dir.parent
                    if not repo_path.name.startswith('.'):
                        ok = extractor.extract_tech_from_repo(repo_path)
                        if ok and not do_commits:
                            repos_processed += 1

            if repos_processed == 0 and do_commits:
                print("No Git repositories found in current directory")
                print("Usage: python3 extract_commits.py --help")
                sys.exit(1)

            print(f"\n✓ Processed {repos_processed} repositories")
            print(f"Output directory: {extractor.output_dir}")
            sys.exit(0)

    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
