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

  // State
  const [currentEdgeType, setCurrentEdgeType] = useState<DependencyEdge['type']>('requires');
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; handle: string } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

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
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setDraggingNodeId(nodeId);
      // ドラッグ開始時のオフセットは不要（中心座標で管理しているため）
    },
    [state.nodes]
  );

  /**
   * 接続ハンドルのドラッグ開始
   */
  const handleHandleMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      setConnectionStart({ nodeId, handle });

      // 初期マウス位置を設定
      if (svgRef.current) {
        const svgRect = svgRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - svgRect.left,
          y: e.clientY - svgRect.top
        });
      }
    },
    []
  );

  /**
   * SVG上のマウス移動
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!svgRef.current) return;
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;

      if (draggingNodeId) {
        // ノード移動
        const clampedX = Math.max(50, Math.min(svgRect.width - 50, x));
        const clampedY = Math.max(30, Math.min(svgRect.height - 30, y));
        controllerRef.current.updateNodePosition(draggingNodeId, clampedX, clampedY);
        forceUpdate({});
      } else if (connectionStart) {
        // 接続線描画用
        setMousePos({ x, y });
      }
    },
    [draggingNodeId, connectionStart]
  );

  /**
   * マウスアップ（ドラッグ終了・接続終了）
   */
  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
    if (connectionStart) {
      setConnectionStart(null);
    }
  }, [draggingNodeId, connectionStart, emitAllPorts, onUpdate, spec.id]);

  /**
   * ノード上でマウスアップ（接続完了）
   */
  const handleNodeMouseUp = useCallback(
    (e: React.MouseEvent, targetNodeId: string) => {
      e.stopPropagation();
      if (connectionStart && connectionStart.nodeId !== targetNodeId) {
        try {
          controllerRef.current.addEdge(
            connectionStart.nodeId,
            targetNodeId,
            currentEdgeType
          );
          forceUpdate({});
          emitAllPorts();
          if (onUpdate) {
            const result = controllerRef.current.getResult(spec.id);
            onUpdate(spec.id, result.data);
          }
        } catch (error) {
          console.error('Failed to add edge:', error);
        }
      }
      setConnectionStart(null);
      setDraggingNodeId(null);
    },
    [connectionStart, currentEdgeType, emitAllPorts, onUpdate, spec.id]
  );

  /**
   * ノードダブルクリック（リネーム開始）
   */
  const handleNodeDoubleClick = useCallback((nodeId: string, label: string) => {
    setEditingNodeId(nodeId);
    setEditLabel(label);
  }, []);

  /**
   * リネーム保存
   */
  const handleRenameSave = useCallback(() => {
    if (editingNodeId && editLabel.trim()) {
      controllerRef.current.updateNodeLabel(editingNodeId, editLabel.trim());
      forceUpdate({});
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
    setEditingNodeId(null);
  }, [editingNodeId, editLabel, emitAllPorts, onUpdate, spec.id]);

  /**
   * エッジ削除
   */
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      if (window.confirm('この接続を削除しますか？')) {
        controllerRef.current.removeEdge(edgeId);
        forceUpdate({});
        emitAllPorts();
        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
      }
    },
    [emitAllPorts, onUpdate, spec.id]
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
      label: `新しいノード`,
      x,
      y,
    });
    forceUpdate({});
    emitAllPorts();
    if (onUpdate) {
      const result = controllerRef.current.getResult(spec.id);
      onUpdate(spec.id, result.data);
    }
  }, [emitAllPorts, onUpdate, spec.id]);

  /**
   * ノード削除
   */
  const handleDeleteNode = useCallback(() => {
    if (state.selectedNodeId) {
      if (window.confirm('選択したノードを削除しますか？')) {
        controllerRef.current.removeNode(state.selectedNodeId);
        forceUpdate({});
        emitAllPorts();
        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
      }
    }
  }, [state.selectedNodeId, emitAllPorts, onUpdate, spec.id]);

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    if (window.confirm('すべての配置と接続をリセットしますか？')) {
      controllerRef.current.reset();
      forceUpdate({});
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    }
  }, [emitAllPorts, onUpdate, spec.id]);

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
  const getResult = useCallback((): WidgetResult => {
    return controllerRef.current.getResult(spec.id);
  }, [spec.id]);

  useEffect(() => {
    (window as any)[`widget_${spec.id}_getResult`] = getResult;
    return () => {
      delete (window as any)[`widget_${spec.id}_getResult`];
    };
  }, [spec.id, getResult]);

  // --- Helper Functions for Rendering ---

  // ノードのサイズ計算
  const getNodeSize = (label: string) => {
    const width = Math.max(100, label.length * 14 + 40);
    const height = 50;
    return { width, height };
  };

  // エッジのパス計算（ベジェ曲線）
  const getEdgePath = (source: DependencyNode, target: DependencyNode, isBidirectional: boolean) => {
    const sx = source.x || 0;
    const sy = source.y || 0;
    const tx = target.x || 0;
    const ty = target.y || 0;

    if (!isBidirectional) {
      // 直線（または緩やかなカーブ）
      return `M ${sx} ${sy} L ${tx} ${ty}`;
    } else {
      // 双方向の場合はカーブさせる
      // 中点
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      // 法線ベクトル
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;
      // 制御点（距離に応じてオフセット量を調整）
      const offset = 30;
      const cx = mx + nx * offset;
      const cy = my + ny * offset;

      return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
    }
  };

  return (
    <div className={styles.container} role="region" aria-label="依存関係マッピング" data-testid="dep-map-container">
      {/* Canvas */}
      <div className={styles.canvasArea} style={{ cursor: connectionStart ? 'grabbing' : 'default' }}>
        <svg
          ref={svgRef}
          className={styles.svg}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-testid="dep-map-canvas"
        >
          <defs>
            {/* Arrow Markers for each color */}
            {(Object.keys(EDGE_TYPE_COLORS) as DependencyEdge['type'][]).map(type => (
              <marker
                key={type}
                id={`arrow-${type}`}
                markerWidth="10"
                markerHeight="7"
                refX="28" // ノードの半径/サイズに合わせて調整が必要（一旦適当）
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill={EDGE_TYPE_COLORS[type]} />
              </marker>
            ))}
            {/* Default arrow for temp line */}
            <marker
              id="arrow-default"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
            </marker>
          </defs>

          {/* Edges */}
          {state.edges.map((edge) => {
            const source = state.nodes.find((n) => n.id === edge.sourceId);
            const target = state.nodes.find((n) => n.id === edge.targetId);
            if (!source || !target) return null;

            const isBidirectional = controllerRef.current.hasInverseEdge(edge.sourceId, edge.targetId);
            const isCritical = criticalPath.includes(edge.sourceId) && criticalPath.includes(edge.targetId);
            const pathD = getEdgePath(source, target, isBidirectional);

            // ターゲットノードの境界で矢印を止めるための調整は複雑なので、
            // マーカーの refX を調整するか、パスを短くする計算が必要。
            // ここでは簡易的に refX を大きめにとる（rectのサイズによるが...）
            // rectの場合は中心から境界までの距離が角度によって違うため、厳密には交点計算が必要。
            // 今回は簡易実装として、refXを少し大きめに設定して対応する。

            return (
              <g key={edge.id} className={styles.edgeGroup} onClick={(e) => handleEdgeClick(e, edge.id)}>
                {/* Hit area (thicker transparent line) */}
                <path
                  d={pathD}
                  stroke="transparent"
                  strokeWidth="15"
                  fill="none"
                  style={{ cursor: 'pointer' }}
                />
                {/* Visible line */}
                <path
                  d={pathD}
                  stroke={EDGE_TYPE_COLORS[edge.type]}
                  strokeWidth={isCritical ? 4 : 2}
                  strokeDasharray={edge.type === 'influences' ? '5,5' : undefined}
                  fill="none"
                  markerEnd={`url(#arrow-${edge.type})`}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })}

          {/* Temporary Connection Line */}
          {connectionStart && (
            <line
              x1={state.nodes.find(n => n.id === connectionStart.nodeId)?.x || 0}
              y1={state.nodes.find(n => n.id === connectionStart.nodeId)?.y || 0}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd="url(#arrow-default)"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Nodes */}
          {state.nodes.map((node) => {
            const { width, height } = getNodeSize(node.label);
            const isSelected = state.selectedNodeId === node.id;
            const isEditing = editingNodeId === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x || 0}, ${node.y || 0})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onDoubleClick={() => handleNodeDoubleClick(node.id, node.label)}
                onClick={(e) => {
                  e.stopPropagation();
                  controllerRef.current.selectNode(node.id);
                  forceUpdate({});
                }}
                className={styles.nodeGroup}
                style={{ cursor: 'move' }}
              >
                {/* Node Shape */}
                <rect
                  x={-width / 2}
                  y={-height / 2}
                  width={width}
                  height={height}
                  rx="25"
                  ry="25"
                  fill={criticalPath.includes(node.id) ? '#dcfce7' : 'white'}
                  stroke={isSelected ? '#3b82f6' : criticalPath.includes(node.id) ? '#22c55e' : '#cbd5e1'}
                  strokeWidth={isSelected ? 3 : 2}
                  className={styles.nodeRect}
                />

                {/* Label */}
                {!isEditing && (
                  <text
                    textAnchor="middle"
                    dy="5"
                    className={styles.nodeLabel}
                    style={{ pointerEvents: 'none', userSelect: 'none', fontSize: '14px', fontWeight: 500 }}
                  >
                    {node.label}
                  </text>
                )}

                {/* Editing Input (ForeignObject) */}
                {isEditing && (
                  <foreignObject x={-width / 2} y={-height / 2} width={width} height={height}>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleRenameSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave();
                        e.stopPropagation();
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </foreignObject>
                )}

                {/* Connection Handles (Visible on Hover - handled by CSS usually, but here we render them) */}
                {/* CSSで .nodeGroup:hover .handle { opacity: 1 } とする想定 */}
                <g className={styles.handles}>
                  {/* Top */}
                  <circle cx="0" cy={-height / 2} r="6" fill="#3b82f6" className={styles.handle} onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'top')} />
                  {/* Right */}
                  <circle cx={width / 2} cy="0" r="6" fill="#3b82f6" className={styles.handle} onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'right')} />
                  {/* Bottom */}
                  <circle cx="0" cy={height / 2} r="6" fill="#3b82f6" className={styles.handle} onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'bottom')} />
                  {/* Left */}
                  <circle cx={-width / 2} cy="0" r="6" fill="#3b82f6" className={styles.handle} onMouseDown={(e) => handleHandleMouseDown(e, node.id, 'left')} />
                </g>
              </g>
            );
          })}
        </svg>

        {/* Floating Toolbar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-4 border border-gray-200">
          <button
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50"
            onClick={handleAddNode}
            title="ノードを追加"
          >
            <span className="text-lg">+</span> 追加
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">接続タイプ:</span>
            <div className="flex gap-1">
              {(Object.keys(EDGE_TYPE_COLORS) as DependencyEdge['type'][]).map((type) => (
                <button
                  key={type}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${currentEdgeType === type ? 'scale-110 ring-2 ring-offset-1 ring-blue-200' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    backgroundColor: EDGE_TYPE_COLORS[type],
                    borderColor: 'white',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => setCurrentEdgeType(type)}
                  title={EDGE_TYPE_LABELS[type]}
                />
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <button
            className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded disabled:opacity-30"
            onClick={handleDeleteNode}
            disabled={!state.selectedNodeId}
            title="選択したノードを削除"
          >
            削除
          </button>

          <button
            className="text-sm text-gray-500 hover:bg-gray-100 px-3 py-1 rounded"
            onClick={handleReset}
            title="リセット"
          >
            リセット
          </button>

          <button
            className="bg-blue-600 text-white text-sm px-4 py-1 rounded-full hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            完了
          </button>
        </div>
      </div>

      {/* Legend / Info (Optional, kept minimal) */}
      <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-100 text-xs">
        <div className="font-bold mb-1">操作ガイド</div>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>ドラッグ: ノード移動</li>
          <li>青い点ドラッグ: 接続</li>
          <li>ダブルクリック: 名前変更</li>
          <li>線クリック: 接続削除</li>
        </ul>
      </div>
    </div>
  );
};

export default DependencyMapping;
