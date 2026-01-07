#!/usr/bin/env python3
"""
Extract commits from Git repositories and generate CSV files.

This script scans for Git repositories and extracts commit history,
saving the data to CSV files in a configurable output directory.

Usage:
    python3 extract_commits.py [--output <directory>] [--repo <path>] [--all]
    
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
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any


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
        description='Extract commits from Git repositories and generate CSV files.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract from all repos in current directory
  python3 extract_commits.py
  
  # Extract to custom output directory
  python3 extract_commits.py --output ./my_commits
  
  # Extract from specific repository
  python3 extract_commits.py --repo /path/to/repo
  
  # Search in specific directory for all repos
  python3 extract_commits.py --search /path/to/search
        """
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output directory for CSV files (default: ./commits)',
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
        help='Filter commits by default authors: silvestronimarco@gmail.com, marco.silvestroni@accenture.com, marco.sivestroni@external.stellantis.com, sd21107'
    )
    
    parser.add_argument(
        '--author',
        type=str,
        nargs='+',
        help='Filter commits by email or username (can specify multiple)',
        default=None
    )
    
    args = parser.parse_args()
    
    try:
        # Determine author filter
        # Default: use DEFAULT_AUTHORS if no filter specified
        author_filter = GitCommitExtractor.DEFAULT_AUTHORS
        
        if args.author:
            author_filter = args.author
            print(f"📧 Filtering commits by authors: {', '.join(author_filter)}\n")
        else:
            print(f"📧 Filtering commits by authors: {', '.join(author_filter)}\n")
        
        extractor = GitCommitExtractor(output_dir=args.output, author_filter=author_filter)
        
        if args.repo:
            # Extract from specific repository
            repo_path = Path(args.repo).resolve()
            print(f"Processing repository: {repo_path}")
            success = extractor.extract_from_repo(repo_path)
            sys.exit(0 if success else 1)
        
        elif args.search or args.all:
            # Search in directory
            search_dir = Path(args.search or '.').resolve()
            repos_processed = extractor.extract_from_directory(search_dir)
            print(f"\nProcessed {repos_processed} repositories")
            sys.exit(0 if repos_processed > 0 else 1)
        
        else:
            # Default: search in current directory
            repos_processed = extractor.extract_from_directory(Path.cwd())
            
            if repos_processed == 0:
                print("No Git repositories found in current directory")
                print("Usage: python3 extract_commits.py --help")
                sys.exit(1)
            
            print(f"\n✓ Processed {repos_processed} repositories")
            print(f"CSV files saved to: {extractor.output_dir}")
            sys.exit(0)
    
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(130)
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
