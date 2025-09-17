import { useState, useEffect } from 'react'
import { DatabaseTest } from './components/DatabaseTest'

function App() {
  const [serverStatus, setServerStatus] = useState<string>('接続中...')
  const [currentView, setCurrentView] = useState<'overview' | 'database'>('overview')

  useEffect(() => {
    // サーバーのヘルスチェック
    fetch('http://localhost:3000/health')
      .then(response => response.json())
      .then(data => {
        setServerStatus(`✅ サーバー接続成功: ${data.service}`)
      })
      .catch(() => {
        setServerStatus('❌ サーバー接続失敗')
      })
  }, [])

  if (currentView === 'database') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setCurrentView('overview')}
            className="mb-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← 概要に戻る
          </button>
          <DatabaseTest />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎯 Concern App
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Phase 0 - Day 2 実装中！
          </p>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ フロントエンド</h3>
              <p className="text-sm text-green-700">
                React + TypeScript + Tailwind CSS + Capacitor
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🚀 バックエンド</h3>
              <p className="text-sm text-blue-700 mb-2">
                Bun + Hono サーバー
              </p>
              <p className="text-xs text-blue-600">
                {serverStatus}
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">💾 データベース</h3>
              <p className="text-sm text-yellow-700 mb-2">
                IndexedDB + Dexie実装完了
              </p>
              <button
                onClick={() => setCurrentView('database')}
                className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors"
              >
                テスト画面へ →
              </button>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">📡 factors辞書</h3>
              <p className="text-sm text-purple-700">
                コンテキスト収集システム実装済み
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              次のフェーズ: サーバーデータベース（SQLite + Drizzle）
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
