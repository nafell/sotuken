#!/usr/bin/env python3
"""
開発者活動時間表生成スクリプト
gitコミットログから活動時間をASCII表で可視化
"""

import argparse
import subprocess
from datetime import datetime, timedelta
from collections import defaultdict


def get_commits(start_date=None, end_date=None):
    """指定期間のコミットログを取得"""
    cmd = [
        "git", "log",
        "--format=%ad",
        "--date=format:%Y-%m-%d %H",
        "--all"
    ]
    if start_date:
        cmd.append(f"--since={start_date}")
    if end_date:
        # --untilは指定日を含まないので+1日する
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        cmd.append(f"--until={end_dt.strftime('%Y-%m-%d')}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip().split("\n")


def parse_commits(commit_lines):
    """コミットログをパースして日付→時間のマッピングを作成（コミット数カウント）"""
    activity = defaultdict(lambda: defaultdict(int))

    for line in commit_lines:
        if not line.strip():
            continue
        parts = line.strip().split(" ")
        if len(parts) >= 2:
            date = parts[0]
            hour = int(parts[1])
            activity[date][hour] += 1

    return activity


def generate_date_range(start_date, end_date):
    """指定期間の日付リストを生成"""
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    dates = []
    current = start
    while current <= end:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return dates


def get_density_char(count):
    """コミット数に応じた濃淡文字を返す（2文字）"""
    if count == 0:
        return "  "
    elif count == 1:
        return "░░"
    elif count == 2:
        return "▒▒"
    elif count <= 4:
        return "▓▓"
    else:
        return "██"


def create_activity_table(activity, dates, density_mode=False):
    """ASCII形式の活動時間表を生成"""
    # 24時間分 = 48文字 (各時間2文字)
    # ヘッダー: 0,6,12,18,24 の位置にマーク
    # 位置: 0=0, 6=12, 12=24, 18=36, 24=48
    header_line = "0           6           12          18          24"
    date_col_width = 14  # "2025-12-02(火)" = 14文字

    separator = "-" * (date_col_width + 1 + 48 + 1)

    lines = []
    lines.append("")
    lines.append("開発者活動時間表")
    if density_mode:
        lines.append("濃淡: ░░(1) ▒▒(2) ▓▓(3-4) ██(5+)")
    else:
        lines.append("X = コミットあり, スペース = コミットなし")
    lines.append("")
    lines.append(" " * date_col_width + " " + header_line)
    lines.append(separator)

    total_commits = 0
    for date in dates:
        # 曜日を取得
        dt = datetime.strptime(date, "%Y-%m-%d")
        weekday = ["月", "火", "水", "木", "金", "土", "日"][dt.weekday()]

        # 各時間のアクティビティをチェック (2文字ずつ)
        hours_str = ""
        day_activity = activity.get(date, {})
        for h in range(24):
            count = day_activity.get(h, 0)
            total_commits += count
            if density_mode:
                hours_str += get_density_char(count)
            else:
                if count > 0:
                    hours_str += " X"
                else:
                    hours_str += "  "

        lines.append(f"{date}({weekday})|{hours_str}|")

    lines.append(separator)
    lines.append(" " * date_col_width + " " + header_line)
    lines.append("")

    # 統計情報
    active_hours = sum(1 for d in dates for h in range(24) if activity.get(d, {}).get(h, 0) > 0)
    active_days = sum(1 for d in dates if activity.get(d, {}))

    lines.append(f"統計:")
    lines.append(f"  - 総コミット数: {total_commits}")
    lines.append(f"  - 総アクティブ時間帯数: {active_hours}")
    lines.append(f"  - アクティブ日数: {active_days}/{len(dates)}日")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="開発者活動時間表を生成")
    parser.add_argument("--start", "-s", help="開始日 (YYYY-MM-DD)")
    parser.add_argument("--end", "-e", help="終了日 (YYYY-MM-DD)")
    parser.add_argument("--density", "-d", action="store_true", help="濃淡モード（コミット密度表示）")
    args = parser.parse_args()

    # デフォルト: 過去2週間
    if args.end:
        end_date = args.end
    else:
        end_date = datetime.now().strftime("%Y-%m-%d")

    if args.start:
        start_date = args.start
    else:
        start_dt = datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=13)
        start_date = start_dt.strftime("%Y-%m-%d")

    # コミットログ取得
    commit_lines = get_commits(start_date, end_date)

    # パース
    activity = parse_commits(commit_lines)

    # 日付範囲生成
    dates = generate_date_range(start_date, end_date)

    # 表生成
    table = create_activity_table(activity, dates, density_mode=args.density)

    print(table)


if __name__ == "__main__":
    main()
