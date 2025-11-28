#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=========================================="
echo "  頭の棚卸しノート - 開発環境セットアップ"
echo "=========================================="
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# エラーハンドリング
error_exit() {
    echo -e "${RED}エラー: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. mise チェック
echo "1. ランタイム環境をチェック中..."
if command -v mise &> /dev/null; then
    success "mise がインストールされています"
    mise install
    success "Bun と Node.js をインストールしました"
else
    warn "mise が見つかりません"
    echo "   mise をインストールしてください: https://mise.jdx.dev/getting-started.html"
    echo ""
    echo "   または手動でインストール:"
    echo "   - Bun 1.2+: https://bun.sh"
    echo "   - Node.js 22+: https://nodejs.org"
    echo ""

    # mise なしでも続行可能か確認
    if ! command -v bun &> /dev/null; then
        error_exit "bun が見つかりません。mise または bun をインストールしてください"
    fi
    if ! command -v node &> /dev/null; then
        error_exit "node が見つかりません。mise または node をインストールしてください"
    fi
    success "bun と node が見つかりました（mise なしで続行）"
fi

# 2. Docker チェック
echo ""
echo "2. Docker をチェック中..."
if command -v docker &> /dev/null; then
    success "Docker がインストールされています"
else
    error_exit "Docker が見つかりません。Docker Desktop をインストールしてください: https://www.docker.com/products/docker-desktop"
fi

# 3. 環境変数ファイルの作成
echo ""
echo "3. 環境変数ファイルをセットアップ中..."

if [ ! -f ".env.development" ]; then
    if [ -f ".env.development.example" ]; then
        cp .env.development.example .env.development
        success ".env.development を作成しました"
        warn "必要に応じて .env.development を編集してください"
    else
        error_exit ".env.development.example が見つかりません"
    fi
else
    success ".env.development は既に存在します"
fi

if [ ! -f "server/.env.local" ]; then
    cat > server/.env.local << 'EOF'
DATABASE_URL=postgresql://sotuken:sotuken_dev@localhost:5432/sotuken_dev
EOF
    success "server/.env.local を作成しました"
else
    success "server/.env.local は既に存在します"
fi

# 4. 依存関係のインストール
echo ""
echo "4. 依存関係をインストール中..."

echo "   server/ の依存関係..."
(cd server && bun install)
success "server/ の依存関係をインストールしました"

echo "   concern-app/ の依存関係..."
(cd concern-app && bun install)
success "concern-app/ の依存関係をインストールしました"

# 5. PostgreSQL 起動
echo ""
echo "5. PostgreSQL を起動中..."
docker compose -f docker-compose.dev.yml up -d

# PostgreSQL が ready になるまで待機
echo "   PostgreSQL の起動を待機中..."
timeout=30
while ! docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U sotuken -d sotuken_dev > /dev/null 2>&1; do
    timeout=$((timeout - 1))
    if [ $timeout -le 0 ]; then
        error_exit "PostgreSQL の起動がタイムアウトしました"
    fi
    sleep 1
done
success "PostgreSQL が起動しました"

# 6. データベースマイグレーション
echo ""
echo "6. データベースマイグレーションを実行中..."
(cd server && bun run db:migrate)
success "マイグレーションが完了しました"

# 7. Git hooks セットアップ
echo ""
echo "7. Git hooks をセットアップ中..."
if [ -d ".githooks" ]; then
    git config core.hooksPath .githooks
    success "Git hooks を設定しました"
else
    warn ".githooks ディレクトリが見つかりません（スキップ）"
fi

# 8. Playwright (E2Eテスト用、オプション)
echo ""
echo "8. Playwright ブラウザをインストール中..."
if (cd concern-app && bunx playwright install --with-deps chromium 2>/dev/null); then
    success "Playwright (Chromium) をインストールしました"
else
    warn "Playwright のインストールをスキップしました（E2Eテストに必要な場合は手動でインストールしてください）"
fi

# 完了
echo ""
echo "=========================================="
echo -e "${GREEN}セットアップ完了！${NC}"
echo "=========================================="
echo ""
echo "開発を始めるには:"
echo ""
echo "  # PostgreSQL を起動（初回以降）"
echo "  docker compose -f docker-compose.dev.yml up -d"
echo ""
echo "  # バックエンド（ターミナル1）"
echo "  cd server && bun run dev"
echo ""
echo "  # フロントエンド（ターミナル2）"
echo "  cd concern-app && bun run dev"
echo ""
echo "  # マイグレーション（スキーマ変更時）"
echo "  cd server && bun run db:migrate"
echo ""
