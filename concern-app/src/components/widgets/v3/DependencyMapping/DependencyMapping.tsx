/**
 * DependencyMapping.tsx
 * 依存関係マッピングWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * ノード間の依存関係を可視化・編集するWidget
 *
 * Reactive Port対応 (Phase 4 Task 2.2):
 * - outputs: nodes (object[]), edges (object[]), critical_path (string[]), has_cycle (boolean)
 * - reserved: _completed, _error
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  DependencyMappingController,
  DEFAULT_NODES,
  EDGE_TYPE_COLORS,
  EDGE_TYPE_LABELS,
  type DependencyNode,
  type DependencyEdge,
} from './DependencyMappingController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './DependencyMapping.module.css';

/**
 * DependencyMapping Component
 */
export const DependencyMapping: React.FC<BaseWidgetProps> = ({
  spec,
  onComplete,
  onUpdate,
  onPortChange,
  getPortValue,
  initialPortValues,
}) => {
  // Reactive Ports
  const { emitPort, setCompleted } = useReactivePorts({
    widgetId: spec.id,
    onPortChange,
    getPortValue,
    initialPortValues,
  });
  const [, forceUpdate] = useState({});
  const [isAddingEdge, setIsAddingEdge] = useState(false);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [currentEdgeType, setCurrentEdgeType] = useState<DependencyEdge['type']>('requires');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [_dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const controllerRef = useRef<DependencyMappingController>(
    new DependencyMappingController()
  );

  // configからノードを設定
  useEffect(() => {
    const nodes = spec.config.nodes as DependencyNode[] | undefined;
    if (nodes && nodes.length > 0) {
      controllerRef.current.setNodes(nodes);
    } else {
      controllerRef.current.setNodes(DEFAULT_NODES);
    }
    forceUpdate({});
  }, [spec.config.nodes]);

  const state = controllerRef.current.getState();
  const criticalPath = controllerRef.current.getCriticalPath();
  const cycle = controllerRef.current.detectCycle();
  const canComplete = state.edges.length > 0;

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('nodes', state.nodes);
    emitPort('edges', state.edges);
    emitPort('critical_path', criticalPath);
    emitPort('has_cycle', cycle !== null);
  }, [emitPort, state.nodes, state.edges, criticalPath, cycle]);

  // canComplete状態の変更を検知してsetCompleted発行
  useEffect(() => {
    if (canComplete) {
      setCompleted(true);
    } else {
      setCompleted(false, ['1つ以上の接続']);
    }
  }, [canComplete, setCompleted]);

  /**
   * ノードのドラッグ開始
   */
  const handleNodeDragStart = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (isAddingEdge) return;

      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setDraggingNodeId(nodeId);
      setDragOffset({
        x: e.clientX - (node.x || 0),
        y: e.clientY - (node.y || 0),
      });
    },
    [isAddingEdge, state.nodes]
  );

  /**
   * ノードのドラッグ
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNodeId || !svgRef.current) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const x = Math.max(30, Math.min(svgRect.width - 30, e.clientX - svgRect.left));
      const y = Math.max(30, Math.min(svgRect.height - 30, e.clientY - svgRect.top));

      controllerRef.current.updateNodePosition(draggingNodeId, x, y);
      forceUpdate({});
    },
    [draggingNodeId]
  );

  /**
   * ノードのドラッグ終了
   */
  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  }, [draggingNodeId, onUpdate, spec.id, emitAllPorts]);

  /**
   * ノードクリック
   */
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (isAddingEdge) {
        if (edgeSourceId === null) {
          setEdgeSourceId(nodeId);
          controllerRef.current.selectNode(nodeId);
        } else if (edgeSourceId !== nodeId) {
          try {
            controllerRef.current.addEdge(edgeSourceId, nodeId, currentEdgeType);
            forceUpdate({});
            // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
            emitAllPorts();
            if (onUpdate) {
              const result = controllerRef.current.getResult(spec.id);
              onUpdate(spec.id, result.data);
            }
          } catch (error) {
            console.error('Failed to add edge:', error);
          }
          setEdgeSourceId(null);
          controllerRef.current.selectNode(null);
        }
      } else {
        controllerRef.current.selectNode(
          state.selectedNodeId === nodeId ? null : nodeId
        );
        forceUpdate({});
      }
    },
    [isAddingEdge, edgeSourceId, currentEdgeType, state.selectedNodeId, onUpdate, spec.id, emitAllPorts]
  );

  /**
   * エッジ削除
   */
  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      if (!isAddingEdge) {
        controllerRef.current.removeEdge(edgeId);
        forceUpdate({});
        // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
        emitAllPorts();
        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
      }
    },
    [isAddingEdge, onUpdate, spec.id, emitAllPorts]
  );

  /**
   * ノード追加
   */
  const handleAddNode = useCallback(() => {
    const newId = `node_${Date.now()}`;
    const x = 100 + Math.random() * 200;
    const y = 100 + Math.random() * 200;
    controllerRef.current.addNode({
      id: newId,
      label: `ノード${state.nodes.length + 1}`,
      x,
      y,
    });
    forceUpdate({});
    // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [state.nodes.length, onUpdate, spec.id, emitAllPorts]);

  /**
   * ノード削除
   */
  const handleDeleteNode = useCallback(() => {
    if (state.selectedNodeId) {
      controllerRef.current.removeNode(state.selectedNodeId);
      forceUpdate({});
      // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  }, [state.selectedNodeId, onUpdate, spec.id, emitAllPorts]);

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    controllerRef.current.reset();
    setIsAddingEdge(false);
    setEdgeSourceId(null);
    forceUpdate({});
    // Reactive Port出力（後方互換性のためonUpdateも呼ぶ）
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [onUpdate, spec.id, emitAllPorts]);

  /**
   * 完了
   */
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete(spec.id);
    }
  }, [onComplete, spec.id]);

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
    <div className={styles.container} role="region" aria-label="依存関係マッピング" data-testid="dep-map-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || '依存関係を整理する'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || 'ノード間の関係性をドラッグで接続してください'}
        </p>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={`${styles.toolButton} ${styles.addNodeButton}`} onClick={handleAddNode} data-testid="dep-map-add-node-btn">
            + ノード追加
          </button>
          <button
            className={`${styles.toolButton} ${styles.addEdgeButton} ${isAddingEdge ? styles.addEdgeButtonActive : ''
              }`}
            onClick={() => {
              setIsAddingEdge(!isAddingEdge);
              setEdgeSourceId(null);
              controllerRef.current.selectNode(null);
              forceUpdate({});
            }}
            data-testid="dep-map-connect-btn"
          >
            {isAddingEdge ? '接続中...' : '→ 接続'}
          </button>
          <button
            className={`${styles.toolButton} ${styles.deleteButton}`}
            onClick={handleDeleteNode}
            disabled={!state.selectedNodeId}
            data-testid="dep-map-delete-btn"
          >
            削除
          </button>
        </div>
        <div className={styles.edgeTypeSelector} data-testid="dep-map-edge-type-select">
          <span className={styles.edgeTypeLabel}>接続タイプ:</span>
          {(Object.keys(EDGE_TYPE_COLORS) as DependencyEdge['type'][]).map((type) => (
            <button
              key={type}
              className={`${styles.edgeTypeButton} ${currentEdgeType === type ? styles.edgeTypeButtonActive : ''
                }`}
              style={{
                borderColor: EDGE_TYPE_COLORS[type],
                backgroundColor: currentEdgeType === type ? EDGE_TYPE_COLORS[type] : 'white',
              }}
              onClick={() => setCurrentEdgeType(type)}
            >
              {EDGE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className={styles.canvasArea}>
        <svg
          ref={svgRef}
          className={styles.svg}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-testid="dep-map-canvas"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>

          {/* Edges */}
          {state.edges.map((edge) => {
            const source = state.nodes.find((n) => n.id === edge.sourceId);
            const target = state.nodes.find((n) => n.id === edge.targetId);
            if (!source || !target) return null;

            const isCritical =
              criticalPath.includes(edge.sourceId) &&
              criticalPath.includes(edge.targetId);

            return (
              <g key={edge.id}>
                <line
                  className={styles.edgeClickable}
                  x1={source.x || 0}
                  y1={source.y || 0}
                  x2={target.x || 0}
                  y2={target.y || 0}
                  onClick={() => handleEdgeClick(edge.id)}
                />
                <line
                  className={`${styles.edge} ${styles[`edge${edge.type.charAt(0).toUpperCase() + edge.type.slice(1)}`]}`}
                  x1={source.x || 0}
                  y1={source.y || 0}
                  x2={target.x || 0}
                  y2={target.y || 0}
                  stroke={EDGE_TYPE_COLORS[edge.type]}
                  strokeWidth={isCritical ? 4 : 2}
                  strokeDasharray={edge.type === 'influences' ? '5,5' : undefined}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {state.nodes.map((node) => (
            <g
              key={node.id}
              className={`${styles.node} ${state.selectedNodeId === node.id ? styles.nodeSelected : ''
                }`}
              transform={`translate(${node.x || 0}, ${node.y || 0})`}
              onMouseDown={(e) => handleNodeDragStart(e, node.id)}
              onClick={() => handleNodeClick(node.id)}
              data-testid={`dep-map-node-${node.id}`}
            >
              <circle
                className={styles.nodeCircle}
                r={25}
                fill={
                  edgeSourceId === node.id
                    ? '#f59e0b'
                    : criticalPath.includes(node.id)
                      ? '#22c55e'
                      : '#3b82f6'
                }
              />
              <text className={styles.nodeLabel} dy="5">
                {node.label.length > 8 ? node.label.slice(0, 8) + '...' : node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Info panel */}
      <div className={styles.infoPanel}>
        <h4 className={styles.infoPanelTitle}>分析結果</h4>
        <p className={styles.infoItem}>
          ノード数: {state.nodes.length} / エッジ数: {state.edges.length}
        </p>
        {cycle && (
          <p className={`${styles.infoItem} ${styles.error}`}>
            循環依存を検出: {cycle.join(' → ')}
          </p>
        )}
        {criticalPath.length > 1 && (
          <p className={`${styles.infoItem} ${styles.criticalPath}`}>
            クリティカルパス: {criticalPath.map((id) =>
              state.nodes.find((n) => n.id === id)?.label || id
            ).join(' → ')}
          </p>
        )}
        <div className={styles.legend}>
          {(Object.keys(EDGE_TYPE_COLORS) as DependencyEdge['type'][]).map((type) => (
            <div key={type} className={styles.legendItem}>
              <div
                className={styles.legendLine}
                style={{ backgroundColor: EDGE_TYPE_COLORS[type] }}
              />
              <span>{EDGE_TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={state.edges.length === 0}
          data-testid="dep-map-complete-btn"
        >
          完了
        </button>
      </div>
    </div>
  );
};

export default DependencyMapping;
