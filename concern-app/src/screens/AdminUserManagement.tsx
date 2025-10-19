/**
 * AdminUserManagement（Phase 2 Step 5）
 * 管理者用ユーザー条件管理画面
 * 
 * 機能:
 * - 全ユーザーの一覧表示
 * - 実験条件の手動割り当て
 * - 条件別の人数サマリー表示
 * - 割り当ての削除
 */

import React, { useState, useEffect } from 'react';
import { experimentService } from '../services/ClientExperimentService';

/**
 * ユーザー情報の型
 * （本来はサーバーから取得するが、現在はlocalStorageから推測）
 */
interface User {
  userId: string;
  createdAt?: string;
}

/**
 * 実験条件割り当て情報の型
 */
interface ExperimentAssignment {
  userId: string;
  condition: 'dynamic_ui' | 'static_ui' | null;
  assignedAt: Date | null;
  method: 'manual';
  experimentId: string;
  assignedBy?: string;
  note?: string;
}

/**
 * 条件別人数の型
 */
interface AssignmentCounts {
  dynamic_ui: number;
  static_ui: number;
  unassigned: number;
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<ExperimentAssignment[]>([]);
  const [counts, setCounts] = useState<AssignmentCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    loadData();
  }, []);

  /**
   * データ読み込み
   */
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // TODO Phase 2 Step 5.3: 全ユーザー一覧を取得するAPI実装
      // 現時点では、localStorageから現在のユーザーのみを取得
      const currentUserId = experimentService.getUserId();
      setUsers([{ userId: currentUserId }]);

      // 割り当て状況を取得
      const assignmentsResponse = await fetch(`${serverUrl}/admin/assignments`);
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
      }

      // 条件別の人数を取得
      const countsResponse = await fetch(`${serverUrl}/admin/assignments/counts`);
      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        setCounts(countsData);
      }

    } catch (error) {
      console.error('[AdminUserManagement] データ取得エラー:', error);
      alert('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 条件を手動割り当て
   */
  const handleAssign = async (userId: string, condition: 'dynamic_ui' | 'static_ui') => {
    const note = prompt('割り当てメモ（オプション）:');
    
    try {
      const response = await fetch(`${serverUrl}/admin/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          condition,
          assignedBy: 'admin',
          note: note || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      alert(`ユーザー ${userId} を「${condition === 'dynamic_ui' ? '動的UI' : '固定UI'}」に割り当てました`);
      
      // データ再読み込み
      await loadData();

    } catch (error) {
      console.error('[AdminUserManagement] 割り当てエラー:', error);
      alert('割り当てに失敗しました');
    }
  };

  /**
   * 割り当てを削除
   */
  const handleRemove = async (userId: string) => {
    if (!window.confirm('この割り当てを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/admin/assignments/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      alert(`ユーザー ${userId} の割り当てを削除しました`);
      
      // データ再読み込み
      await loadData();

    } catch (error) {
      console.error('[AdminUserManagement] 削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>
        実験条件管理（管理者用）
      </h1>

      {/* 統計サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', backgroundColor: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', color: '#1E40AF', margin: '0 0 8px 0' }}>動的UI群</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#1E3A8A', margin: 0 }}>
            {counts?.dynamic_ui || 0}名
          </p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#D1FAE5', border: '2px solid #10B981', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', color: '#065F46', margin: '0 0 8px 0' }}>固定UI群</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#064E3B', margin: 0 }}>
            {counts?.static_ui || 0}名
          </p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#F3F4F6', border: '2px solid #9CA3AF', borderRadius: '12px' }}>
          <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 8px 0' }}>未割り当て</p>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
            {counts?.unassigned || 0}名
          </p>
        </div>
      </div>

      {/* ユーザー一覧テーブル */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                ユーザーID
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                実験条件
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                割り当て日時
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                メモ
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const assignment = assignments.find(a => a.userId === user.userId);
              
              return (
                <tr key={user.userId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  {/* ユーザーID */}
                  <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>
                    {user.userId}
                  </td>
                  
                  {/* 実験条件 */}
                  <td style={{ padding: '16px' }}>
                    {assignment?.condition ? (
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: assignment.condition === 'dynamic_ui' ? '#EFF6FF' : '#D1FAE5',
                        color: assignment.condition === 'dynamic_ui' ? '#1E40AF' : '#065F46'
                      }}>
                        {assignment.condition === 'dynamic_ui' ? '動的UI' : '固定UI'}
                      </span>
                    ) : (
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280'
                      }}>
                        未割り当て
                      </span>
                    )}
                  </td>
                  
                  {/* 割り当て日時 */}
                  <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                    {assignment?.assignedAt 
                      ? new Date(assignment.assignedAt).toLocaleString('ja-JP')
                      : '-'}
                  </td>
                  
                  {/* メモ */}
                  <td style={{ padding: '16px', fontSize: '14px', color: '#6B7280' }}>
                    {assignment?.note || '-'}
                  </td>
                  
                  {/* 操作ボタン */}
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAssign(user.userId, 'dynamic_ui')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        }}
                      >
                        動的UI
                      </button>
                      
                      <button
                        onClick={() => handleAssign(user.userId, 'static_ui')}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10B981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#10B981';
                        }}
                      >
                        固定UI
                      </button>
                      
                      {assignment && (
                        <button
                          onClick={() => handleRemove(user.userId)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#EF4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#DC2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#EF4444';
                          }}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 操作ガイド */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#78350F', margin: '0 0 12px 0' }}>
          ⚠️ 運用ガイド
        </h3>
        <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '14px', color: '#92400E', lineHeight: '1.8' }}>
          <li>被験者を均等に割り当ててください（動的UI: 2-3名、固定UI: 2-3名）</li>
          <li>割り当て後、被験者にアプリをリロードしてもらってください</li>
          <li>割り当て変更は慎重に行ってください（データの一貫性のため）</li>
          <li>メモ欄には被験者の識別情報や特記事項を記録できます</li>
        </ul>
      </div>
    </div>
  );
};

