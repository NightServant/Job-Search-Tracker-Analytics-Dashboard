"""
Job Search Analytics - Data Analysis Script
============================================

This script analyzes job application data exported from the Job Search Tracker app.
It provides statistical insights and visualizations to help understand job search patterns.

Requirements:
    pip install pandas matplotlib seaborn

Usage:
    1. Export your job data as CSV from the app
    2. Place the CSV file in the same directory as this script
    3. Run: python data_analysis.py

Author: Job Search Tracker
Date: 2026
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from pathlib import Path
import warnings

warnings.filterwarnings('ignore')

# Configure plotting style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

# Status color mapping (matches the web app)
STATUS_COLORS = {
    'wishlist': '#71717a',      # Gray
    'applied': '#3b82f6',       # Blue
    'interviewing': '#eab308',  # Yellow
    'offer': '#22c55e',         # Green
    'rejected': '#ef4444',      # Red
}


def load_data(filepath: str = 'job-applications.csv') -> pd.DataFrame:
    """
    Load job application data from CSV file.
    
    Args:
        filepath: Path to the CSV file exported from the app
        
    Returns:
        DataFrame with job application data
    """
    try:
        df = pd.read_csv(filepath)
        print(f"✓ Loaded {len(df)} job entries from {filepath}")
        
        # Parse dates
        if 'date_applied' in df.columns:
            df['date_applied'] = pd.to_datetime(df['date_applied'], errors='coerce')
        if 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
            
        return df
    except FileNotFoundError:
        print(f"✗ Error: File '{filepath}' not found.")
        print("  Please export your job data from the app first.")
        return pd.DataFrame()


def basic_statistics(df: pd.DataFrame) -> dict:
    """
    Calculate basic statistics about job applications.
    
    Args:
        df: DataFrame with job data
        
    Returns:
        Dictionary with calculated statistics
    """
    if df.empty:
        return {}
    
    # Total counts
    total_jobs = len(df)
    total_applied = len(df[df['status'] != 'wishlist'])
    
    # Status breakdown
    status_counts = df['status'].value_counts().to_dict()
    
    # Interview and offer counts
    interviews = len(df[df['status'].isin(['interviewing', 'offer'])])
    offers = len(df[df['status'] == 'offer'])
    rejections = len(df[df['status'] == 'rejected'])
    
    # Conversion rates
    conversion_rate = (interviews / total_applied * 100) if total_applied > 0 else 0
    offer_rate = (offers / total_applied * 100) if total_applied > 0 else 0
    rejection_rate = (rejections / total_applied * 100) if total_applied > 0 else 0
    
    # Salary statistics (if available)
    salary_stats = {}
    if 'salary_min' in df.columns and 'salary_max' in df.columns:
        salary_df = df[df['salary_min'].notna() | df['salary_max'].notna()]
        if not salary_df.empty:
            salary_stats = {
                'avg_salary_min': salary_df['salary_min'].mean(),
                'avg_salary_max': salary_df['salary_max'].mean(),
                'median_salary_min': salary_df['salary_min'].median(),
                'median_salary_max': salary_df['salary_max'].median(),
                'jobs_with_salary': len(salary_df),
            }
    
    stats = {
        'total_jobs': total_jobs,
        'total_applied': total_applied,
        'status_counts': status_counts,
        'interviews': interviews,
        'offers': offers,
        'rejections': rejections,
        'conversion_rate': round(conversion_rate, 2),
        'offer_rate': round(offer_rate, 2),
        'rejection_rate': round(rejection_rate, 2),
        **salary_stats,
    }
    
    return stats


def print_report(stats: dict) -> None:
    """Print a formatted statistics report."""
    if not stats:
        print("No data to report.")
        return
    
    print("\n" + "=" * 60)
    print("           JOB SEARCH ANALYTICS REPORT")
    print("=" * 60)
    
    print("\n📊 OVERVIEW")
    print("-" * 40)
    print(f"  Total Jobs Tracked:     {stats['total_jobs']}")
    print(f"  Applications Sent:      {stats['total_applied']}")
    print(f"  Interviews Received:    {stats['interviews']}")
    print(f"  Offers Received:        {stats['offers']}")
    print(f"  Rejections:             {stats['rejections']}")
    
    print("\n📈 CONVERSION RATES")
    print("-" * 40)
    print(f"  Interview Rate:         {stats['conversion_rate']}%")
    print(f"  Offer Rate:             {stats['offer_rate']}%")
    print(f"  Rejection Rate:         {stats['rejection_rate']}%")
    
    print("\n📋 STATUS BREAKDOWN")
    print("-" * 40)
    for status, count in stats.get('status_counts', {}).items():
        pct = (count / stats['total_jobs'] * 100) if stats['total_jobs'] > 0 else 0
        bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
        print(f"  {status.capitalize():15} {bar} {count:3} ({pct:.1f}%)")
    
    if 'avg_salary_min' in stats:
        print("\n💰 SALARY INSIGHTS")
        print("-" * 40)
        print(f"  Jobs with Salary Data:  {stats['jobs_with_salary']}")
        print(f"  Avg Min Salary:         ${stats['avg_salary_min']:,.0f}")
        print(f"  Avg Max Salary:         ${stats['avg_salary_max']:,.0f}")
        print(f"  Median Min Salary:      ${stats['median_salary_min']:,.0f}")
        print(f"  Median Max Salary:      ${stats['median_salary_max']:,.0f}")
    
    print("\n" + "=" * 60 + "\n")


def plot_status_distribution(df: pd.DataFrame, save_path: str = None) -> None:
    """
    Create a pie chart showing status distribution.
    
    Args:
        df: DataFrame with job data
        save_path: Optional path to save the figure
    """
    if df.empty:
        return
    
    status_counts = df['status'].value_counts()
    colors = [STATUS_COLORS.get(s, '#718096') for s in status_counts.index]
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    wedges, texts, autotexts = ax.pie(
        status_counts.values,
        labels=status_counts.index.str.capitalize(),
        autopct='%1.1f%%',
        colors=colors,
        startangle=90,
        explode=[0.02] * len(status_counts),
    )
    
    # Style the text
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontweight('bold')
    
    ax.set_title('Job Application Status Distribution', fontsize=16, fontweight='bold')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ Saved status distribution chart to {save_path}")
    
    plt.show()


def plot_applications_over_time(df: pd.DataFrame, save_path: str = None) -> None:
    """
    Create a bar chart showing applications over time (weekly).
    
    Args:
        df: DataFrame with job data
        save_path: Optional path to save the figure
    """
    if df.empty or 'date_applied' not in df.columns:
        return
    
    # Filter to jobs with application dates
    applied_df = df[df['date_applied'].notna()].copy()
    
    if applied_df.empty:
        print("No application dates available for timeline chart.")
        return
    
    # Group by week
    applied_df['week'] = applied_df['date_applied'].dt.to_period('W').dt.start_time
    weekly_counts = applied_df.groupby('week').size()
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    bars = ax.bar(
        weekly_counts.index,
        weekly_counts.values,
        width=5,
        color='#6366f1',
        edgecolor='#4338ca',
        alpha=0.8,
    )
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax.annotate(
            f'{int(height)}',
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha='center',
            va='bottom',
            fontsize=10,
        )
    
    ax.set_xlabel('Week', fontsize=12)
    ax.set_ylabel('Applications', fontsize=12)
    ax.set_title('Job Applications Over Time', fontsize=16, fontweight='bold')
    
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ Saved applications timeline chart to {save_path}")
    
    plt.show()


def plot_salary_distribution(df: pd.DataFrame, save_path: str = None) -> None:
    """
    Create a box plot showing salary distributions by status.
    
    Args:
        df: DataFrame with job data
        save_path: Optional path to save the figure
    """
    if df.empty or 'salary_min' not in df.columns:
        return
    
    # Calculate average salary for each job
    salary_df = df[df['salary_min'].notna() | df['salary_max'].notna()].copy()
    
    if salary_df.empty:
        print("No salary data available for distribution chart.")
        return
    
    salary_df['avg_salary'] = (
        salary_df[['salary_min', 'salary_max']].mean(axis=1)
    )
    
    fig, ax = plt.subplots(figsize=(12, 6))
    
    order = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected']
    available_statuses = [s for s in order if s in salary_df['status'].unique()]
    colors = [STATUS_COLORS.get(s, '#718096') for s in available_statuses]
    
    sns.boxplot(
        data=salary_df,
        x='status',
        y='avg_salary',
        order=available_statuses,
        palette=colors,
        ax=ax,
    )
    
    ax.set_xlabel('Status', fontsize=12)
    ax.set_ylabel('Average Salary ($)', fontsize=12)
    ax.set_title('Salary Distribution by Application Status', fontsize=16, fontweight='bold')
    
    # Format y-axis as currency
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ Saved salary distribution chart to {save_path}")
    
    plt.show()


def plot_company_frequency(df: pd.DataFrame, top_n: int = 10, save_path: str = None) -> None:
    """
    Create a horizontal bar chart showing most applied-to companies.
    
    Args:
        df: DataFrame with job data
        top_n: Number of top companies to show
        save_path: Optional path to save the figure
    """
    if df.empty:
        return
    
    company_counts = df['company'].value_counts().head(top_n)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    bars = ax.barh(
        company_counts.index[::-1],
        company_counts.values[::-1],
        color='#6366f1',
        edgecolor='#4338ca',
        alpha=0.8,
    )
    
    # Add value labels
    for bar in bars:
        width = bar.get_width()
        ax.annotate(
            f'{int(width)}',
            xy=(width, bar.get_y() + bar.get_height() / 2),
            xytext=(3, 0),
            textcoords="offset points",
            ha='left',
            va='center',
            fontsize=10,
        )
    
    ax.set_xlabel('Number of Applications', fontsize=12)
    ax.set_ylabel('Company', fontsize=12)
    ax.set_title(f'Top {top_n} Companies Applied To', fontsize=16, fontweight='bold')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✓ Saved company frequency chart to {save_path}")
    
    plt.show()


def generate_insights(df: pd.DataFrame, stats: dict) -> list:
    """
    Generate actionable insights from the data.
    
    Args:
        df: DataFrame with job data
        stats: Dictionary with calculated statistics
        
    Returns:
        List of insight strings
    """
    insights = []
    
    if not stats or df.empty:
        return insights
    
    # Application volume insight
    if stats['total_applied'] > 0:
        if stats['total_applied'] < 20:
            insights.append(
                "💡 Low application volume. Consider increasing your applications "
                "to improve chances of landing interviews."
            )
        elif stats['total_applied'] > 100:
            insights.append(
                "💡 High application volume! Make sure you're tailoring each "
                "application rather than using a generic approach."
            )
    
    # Conversion rate insight
    if stats['conversion_rate'] > 0:
        if stats['conversion_rate'] < 10:
            insights.append(
                "💡 Low interview conversion rate. Consider improving your resume "
                "or focusing on roles that better match your experience."
            )
        elif stats['conversion_rate'] > 30:
            insights.append(
                "🌟 Great interview conversion rate! Your resume is effectively "
                "showcasing your skills."
            )
    
    # Wishlist insight
    wishlist_count = stats['status_counts'].get('wishlist', 0)
    if wishlist_count > stats['total_applied']:
        insights.append(
            "💡 You have more jobs in your wishlist than applications sent. "
            "Consider converting wishlist items to applications."
        )
    
    # Rejection recovery insight
    if stats['rejections'] > 0 and stats['interviews'] > 0:
        success_after_rejection_rate = (
            (stats['interviews'] + stats['offers']) / 
            (stats['rejections'] + stats['interviews'] + stats['offers']) * 100
        )
        insights.append(
            f"📊 Despite {stats['rejections']} rejections, you've maintained a "
            f"{success_after_rejection_rate:.1f}% success rate in advancing through the process."
        )
    
    # Time-based insight
    if 'date_applied' in df.columns:
        applied_df = df[df['date_applied'].notna()]
        if len(applied_df) >= 5:
            recent_week = applied_df[
                applied_df['date_applied'] >= (datetime.now() - timedelta(days=7))
            ]
            insights.append(
                f"📅 You've sent {len(recent_week)} applications in the last week."
            )
    
    return insights


def main():
    """Main entry point for the analysis script."""
    print("\n" + "=" * 60)
    print("       JOB SEARCH TRACKER - DATA ANALYSIS")
    print("=" * 60 + "\n")
    
    # Check for CSV files in current directory
    csv_files = list(Path('.').glob('*.csv'))
    
    if not csv_files:
        print("No CSV files found in current directory.")
        print("\nTo use this script:")
        print("1. Export your job data from the Job Search Tracker app")
        print("2. Place the CSV file in this directory")
        print("3. Run: python data_analysis.py\n")
        
        # Create sample data for demonstration
        print("Generating sample data for demonstration...\n")
        sample_data = {
            'company': ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 
                       'Netflix', 'Stripe', 'Airbnb', 'Uber', 'Spotify'],
            'role': ['Software Engineer'] * 10,
            'status': ['applied', 'interviewing', 'rejected', 'offer', 'applied',
                      'rejected', 'wishlist', 'applied', 'interviewing', 'applied'],
            'salary_min': [150000, 160000, 170000, 180000, 155000, 
                          165000, None, 140000, 145000, 135000],
            'salary_max': [200000, 220000, 230000, 250000, 210000,
                          215000, None, 190000, 195000, 185000],
            'date_applied': [
                '2026-03-01', '2026-02-25', '2026-02-20', '2026-02-15', '2026-03-05',
                '2026-02-10', None, '2026-03-08', '2026-02-28', '2026-03-07'
            ],
        }
        df = pd.DataFrame(sample_data)
        df['date_applied'] = pd.to_datetime(df['date_applied'])
    else:
        # Use the first CSV file found (or most recent)
        csv_file = sorted(csv_files, key=lambda x: x.stat().st_mtime)[-1]
        df = load_data(str(csv_file))
    
    if df.empty:
        return
    
    # Calculate and display statistics
    stats = basic_statistics(df)
    print_report(stats)
    
    # Generate insights
    insights = generate_insights(df, stats)
    if insights:
        print("🔍 INSIGHTS & RECOMMENDATIONS")
        print("-" * 40)
        for insight in insights:
            print(f"  {insight}")
        print()
    
    # Create visualizations
    print("📊 Generating visualizations...")
    print("-" * 40)
    
    plot_status_distribution(df, save_path='status_distribution.png')
    plot_applications_over_time(df, save_path='applications_timeline.png')
    plot_salary_distribution(df, save_path='salary_distribution.png')
    plot_company_frequency(df, save_path='top_companies.png')
    
    print("\n✓ Analysis complete!")
    print("  Check the generated PNG files for visualizations.\n")


if __name__ == '__main__':
    main()
