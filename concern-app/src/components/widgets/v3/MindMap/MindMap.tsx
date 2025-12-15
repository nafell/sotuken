/**
 * MindMap.tsx
 * マインドマップWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * 中心テーマから放射状にアイデアを展開するWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  MindMapController,
  LEVEL_COLORS,
  type MindMapNode,
} from './MindMapController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import { EmptyState } from '../../../ui/EmptyState';
import styles from './MindMap.module.css';

interface NodeComponentProps {
  node: MindMapNode;
  controller: MindMapController;
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdate: (nodeId: string, text: string) => void;
  onToggleCollapse: (nodeId: string) => void;
}

/**
 * ノードコンポーネント（再帰的）
 */
const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  controller,
  selectedNodeId,
  onSelect,
  onAddChild,
  onDelete,
  onUpdate,
  onToggleCollapse,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const children = controller.getChildren(node.id);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onUpdate(node.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={styles.nodeContainer} data-testid={`mindmap-node-${node.id}`}>
      <div
        className={`${styles.node} ${selectedNodeId === node.id ? styles.nodeSelected : ''
          }`}
        style={{ borderLeftColor: node.color }}
        onClick={() => onSelect(node.id)}
      >
        {children.length > 0 && (
          <button
            className={`${styles.nodeButton} ${styles.expandButton}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
          >
            {node.collapsed ? '▶' : '▼'}
          </button>
        )}

        {isEditing ? (
          <form
            className={styles.editForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
          >
            <input
              type="text"
              className={styles.editInput}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              data-testid={`mindmap-node-input-${node.id}`}
            />
          </form>
        ) : (
          <span
            className={styles.nodeText}
            onDoubleClick={() => {
              setEditText(node.text);
              setIsEditing(true);
            }}
            data-testid={`mindmap-node-text-${node.id}`}
          >
            {node.text}
          </span>
        )}

        <div className={styles.nodeActions}>
          <button
            className={styles.nodeButton}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            title="子ノードを追加"
            data-testid={`mindmap-node-add-${node.id}`}
          >
            +
          </button>
          <button
            className={`${styles.nodeButton} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="削除"
            data-testid={`mindmap-node-delete-${node.id}`}
          >
            ×
          </button>
        </div>
      </div>

      {!node.collapsed && children.length > 0 && (
        <div className={styles.childrenContainer}>
          {children.map((child) => (
            <NodeComponent
              key={child.id}
              node={child}
              controller={controller}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * MindMap Component
 */
export const MindMap: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Reactive Ports
  const { emitPort, setCompleted, setError } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });

  const [, forceUpdate] = useState({});
  const [centerTopic, setCenterTopic] = useState(
    spec.config.centerTopic || '中心テーマ'
  );
  const controllerRef = useRef<MindMapController>(
    new MindMapController(spec.config.centerTopic || '中心テーマ')
  );

  // configから初期ノードを設定
  useEffect(() => {
    const initialNodes = spec.config.nodes as Array<{
      text: string;
      parentId?: string;
    }> | undefined;

    if (initialNodes && initialNodes.length > 0) {
      controllerRef.current.reset();
      // 親IDがないノードを先に追加
      const nodeIdMap: Record<string, string> = {};
      initialNodes.forEach((n, i) => {
        if (!n.parentId) {
          const node = controllerRef.current.addNode(n.text, null);
          nodeIdMap[`node_${i}`] = node.id;
        }
      });
      // 親IDがあるノードを追加
      initialNodes.forEach((n) => {
        if (n.parentId && nodeIdMap[n.parentId]) {
          controllerRef.current.addNode(n.text, nodeIdMap[n.parentId]);
        }
      });
      forceUpdate({});
    }
  }, [spec.config.nodes]);

  const state = controllerRef.current.getState();
  const rootNodes = controllerRef.current.getRootNodes();
  const nodeCount = controllerRef.current.getNodeCount();
  const maxDepth = controllerRef.current.getMaxDepth();

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('nodes', controllerRef.current.getState().nodes);
    emitPort('summary', controllerRef.current.generateSummary());
  }, [emitPort]);

  /**
   * 中心テーマ更新
   */
  const handleCenterTopicChange = useCallback((topic: string) => {
    setCenterTopic(topic);
    controllerRef.current.setCenterTopic(topic);
    // Reactive Port出力
    emitAllPorts();
  }, [emitAllPorts]);

  /**
   * ルートノード追加
   */
  const handleAddRoot = useCallback(() => {
    controllerRef.current.addNode('新しいアイデア', null);
    forceUpdate({});
    // Reactive Port出力
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * 子ノード追加
   */
  const handleAddChild = useCallback(
    (parentId: string) => {
      controllerRef.current.addNode('サブアイデア', parentId);
      forceUpdate({});
      // Reactive Port出力
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [emitAllPorts, onUpdate, spec.id]
  );

  /**
   * ノード削除
   */
  const handleDelete = useCallback(
    (nodeId: string) => {
      controllerRef.current.removeNode(nodeId);
      forceUpdate({});
      // Reactive Port出力
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [emitAllPorts, onUpdate, spec.id]
  );

  /**
   * ノード更新
   */
  const handleUpdateNode = useCallback(
    (nodeId: string, text: string) => {
      controllerRef.current.updateNode(nodeId, text);
      forceUpdate({});
      // Reactive Port出力
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [emitAllPorts, onUpdate, spec.id]
  );

  /**
   * ノード選択
   */
  const handleSelect = useCallback((nodeId: string | null) => {
    controllerRef.current.selectNode(nodeId);
    forceUpdate({});
  }, []);

  /**
   * 折りたたみ切り替え
   */
  const handleToggleCollapse = useCallback((nodeId: string) => {
    controllerRef.current.toggleCollapse(nodeId);
    forceUpdate({});
  }, []);

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    controllerRef.current.reset();
    forceUpdate({});
    // Reactive Port出力
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * 完了
   */
  const handleComplete = useCallback(() => {
    if (nodeCount === 0) {
      setError(true, ['アイデアを追加してください']);
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [nodeCount, setError, setCompleted, onComplete, spec.id]);

  /**
   * 結果取得
   */
  /**
   * 結果取得
   */
  const getResult = useCallback((): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  }, [spec.id]);

  // 外部から結果を取得できるようにrefを設定
  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, getResult]);

  return (
    <div className={styles.container} role="region" aria-label="マインドマップ" data-testid="mindmap-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || 'マインドマップ'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || '中心テーマからアイデアを広げていきましょう'}
        </p>
      </div>

      {/* Center topic */}
      <div className={styles.centerTopicContainer}>
        <div className={styles.centerTopic}>
          <input
            type="text"
            className={styles.centerTopicInput}
            value={centerTopic}
            onChange={(e) => handleCenterTopicChange(e.target.value)}
            placeholder="中心テーマを入力"
            data-testid="mindmap-center-topic"
          />
        </div>
      </div>

      {/* Mind map area */}
      <div className={styles.mindMapArea}>
        {rootNodes.length === 0 ? (
          <div className="mb-8">
            <EmptyState
              message="アイデアマップを作成しましょう"
              description="中心テーマから連想するアイデアを追加して、思考を広げていきましょう"
              icon={<span role="img" aria-label="mindmap">🧠</span>}
              action={
                <button className={styles.addRootButton} onClick={handleAddRoot} data-testid="mindmap-add-root-btn">
                  + 最初のアイデアを追加
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className={styles.branchesContainer}>
              {rootNodes.map((node) => (
                <div key={node.id} className={styles.branch}>
                  <NodeComponent
                    node={node}
                    controller={controllerRef.current}
                    selectedNodeId={state.selectedNodeId}
                    onSelect={handleSelect}
                    onAddChild={handleAddChild}
                    onDelete={handleDelete}
                    onUpdate={handleUpdateNode}
                    onToggleCollapse={handleToggleCollapse}
                  />
                </div>
              ))}
            </div>
            <button
              className={styles.addNodeButton}
              onClick={handleAddRoot}
              style={{ margin: '1rem auto', display: 'flex' }}
              data-testid="mindmap-add-node-btn"
            >
              + 新しい枝を追加
            </button>
          </>
        )}
      </div>

      {/* Statistics */}
      <div className={styles.statistics}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{nodeCount}</div>
          <div className={styles.statLabel}>アイデア数</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{rootNodes.length}</div>
          <div className={styles.statLabel}>メイン枝</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{maxDepth}</div>
          <div className={styles.statLabel}>最大階層</div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {LEVEL_COLORS.slice(0, 4).map((color, index) => (
          <div key={index} className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: color }} />
            <span>レベル {index + 1}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={nodeCount === 0}
          data-testid="mindmap-complete-btn"
        >
          {nodeCount > 0 ? '完了' : 'アイデアを追加してください'}
        </button>
      </div>
    </div>
  );
};

export default MindMap;
