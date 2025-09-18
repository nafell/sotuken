import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  sessionCompleted?: boolean;
  mentalLoadImprovement?: number;
  prefillConcern?: string;
  fromCompletion?: boolean;
}

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [workingMemoryUsage, setWorkingMemoryUsage] = useState(60);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // サンプル進行中の関心事
  const [activeIssues] = useState([
    { id: 'issue1', title: '卒業研究のテーマ決め', priority: 'high', color: '🔴' },
    { id: 'issue2', title: '友達との旅行計画', priority: 'medium', color: '🟡' },
    { id: 'issue3', title: 'ジム再開', priority: 'low', color: '🟢' }
  ]);

  useEffect(() => {
    if (state?.sessionCompleted && state?.mentalLoadImprovement !== undefined) {
      setWorkingMemoryUsage(prev => Math.max(10, prev - state.mentalLoadImprovement!));
      setShowCompletionMessage(true);
      
      // 3秒後にメッセージを非表示
      const timer = setTimeout(() => setShowCompletionMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleStartSession = () => {
    if (state?.prefillConcern && state?.fromCompletion) {
      // 前のセッションから引き継いだ関心事で開始
      navigate('/concern-input', { 
        state: { prefillConcern: state.prefillConcern }
      });
    } else {
      navigate('/concern-input');
    }
  };

  const getMemoryUsageColor = () => {
    if (workingMemoryUsage >= 70) return 'bg-red-500';
    if (workingMemoryUsage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getMemoryUsageMessage = () => {
    if (workingMemoryUsage >= 70) return '思考の整理が必要かも';
    if (workingMemoryUsage >= 50) return 'バランス良い状態';
    return '頭がスッキリしています！';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* 完了メッセージ */}
        {showCompletionMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg animate-pulse">
            <div className="text-center">
              <div className="text-2xl mb-2">🎉</div>
              <p className="text-green-800 font-medium">
                お疲れさま！頭の整理ができました
              </p>
              <p className="text-sm text-green-600">
                ワーキングメモリが{state?.mentalLoadImprovement || 0}%改善
              </p>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧠 頭の棚卸しノート
          </h1>
          <p className="text-gray-600">
            気になることを整理して、頭をスッキリさせましょう
          </p>
        </div>

        {/* メインCTA */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3 text-center">
              💭 今、気になっていることは？
            </h2>
            
            <button
              onClick={handleStartSession}
              className="w-full py-4 bg-blue-500 text-white rounded-lg font-medium text-lg hover:bg-blue-600 transition-colors shadow-md"
            >
              📝 新しい関心事を整理する
            </button>

            {state?.prefillConcern && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  💡 前回の続き：「{state.prefillConcern.slice(0, 30)}...」
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 現在の頭の状況 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📊 現在の頭の状況
          </h3>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                ワーキングメモリ使用率
              </span>
              <span className="text-sm font-bold text-gray-800">
                {workingMemoryUsage}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${getMemoryUsageColor()}`}
                style={{ width: `${workingMemoryUsage}%` }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-600 text-center">
              {getMemoryUsageMessage()}
            </p>
          </div>
        </div>

        {/* 進行中の関心事 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📋 進行中の関心事 ({activeIssues.length}件)
          </h3>
          
          <div className="space-y-3">
            {activeIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  // TODO: 既存の関心事を編集する機能
                  console.log('Edit issue:', issue.id);
                }}
              >
                <span className="text-lg mr-3">{issue.color}</span>
                <span className="flex-1 text-gray-800">{issue.title}</span>
                <span className="text-xs text-gray-500 capitalize">
                  {issue.priority}
                </span>
              </div>
            ))}
          </div>
          
          {activeIssues.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">🌟</div>
              <p>進行中の関心事はありません</p>
              <p className="text-sm">頭がスッキリしている状態です！</p>
            </div>
          )}
        </div>

        {/* サブメニュー */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              // TODO: 統計画面への遷移
              console.log('Navigate to stats');
            }}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📈</div>
              <span className="text-sm text-gray-700">統計を見る</span>
            </div>
          </button>
          
          <button
            onClick={() => {
              // TODO: 設定画面への遷移
              console.log('Navigate to settings');
            }}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">⚙️</div>
              <span className="text-sm text-gray-700">設定</span>
            </div>
          </button>
        </div>

        {/* デバッグ情報（開発時のみ表示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-2">
              🛠️ 開発モード - Day 5実装完了
            </p>
            <div className="space-y-1 text-xs text-yellow-700">
              <div>• 5画面フロー実装済み</div>
              <div>• React Router設定完了</div>
              <div>• 基本UI・データフロー動作確認</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
