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

  // Confirmation State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

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
      controllerRef.current.selectNode(nodeId);
      forceUpdate({});
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
   * エッジクリック（選択）
   */
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      controllerRef.current.selectEdge(edgeId);
      forceUpdate({});
    },
    []
  );

  /**
   * キャンバスクリック（選択解除）
   */
  const handleCanvasClick = useCallback(() => {
    controllerRef.current.selectNode(null);
    controllerRef.current.selectEdge(null);
    forceUpdate({});
  }, []);

  /**
   * エッジタイプ変更
   */
  const handleEdgeTypeChange = useCallback((type: DependencyEdge['type']) => {
    if (state.selectedEdgeId) {
      controllerRef.current.updateEdgeType(state.selectedEdgeId, type);
      forceUpdate({});
      emitAllPorts();
      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    } else {
      setCurrentEdgeType(type);
    }
  }, [state.selectedEdgeId, emitAllPorts, onUpdate, spec.id]);

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
   * 削除（ノードまたはエッジ）
   */
  const handleDelete = useCallback(() => {
    if (state.selectedNodeId) {
      setConfirmDialog({
        isOpen: true,
        title: 'ノードの削除',
        message: '選択したノードを削除しますか？',
        onConfirm: () => {
          controllerRef.current.removeNode(state.selectedNodeId!);
          forceUpdate({});
          emitAllPorts();
          if (onUpdate) {
            const result = controllerRef.current.getResult(spec.id);
            onUpdate(spec.id, result.data);
          }
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else if (state.selectedEdgeId) {
      setConfirmDialog({
        isOpen: true,
        title: '接続の削除',
        message: '選択した接続を削除しますか？',
        onConfirm: () => {
          controllerRef.current.removeEdge(state.selectedEdgeId!);
          forceUpdate({});
          emitAllPorts();
          if (onUpdate) {
            const result = controllerRef.current.getResult(spec.id);
            onUpdate(spec.id, result.data);
          }
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  }, [state.selectedNodeId, state.selectedEdgeId, emitAllPorts, onUpdate, spec.id]);

  /**
   * リセット
   */
  const handleReset = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: 'リセット',
      message: 'すべてのノードと接続を削除して初期状態に戻します。よろしいですか？',
      onConfirm: () => {
        controllerRef.current.reset();
        forceUpdate({});
        emitAllPorts();
        if (onUpdate) {
          const result = controllerRef.current.getResult(spec.id);
          onUpdate(spec.id, result.data);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
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

  // 線分と矩形の交点を計算する関数
  const getRectIntersection = (
    p1: { x: number; y: number }, // 始点（または制御点）
    p2: { x: number; y: number }, // 終点（ノード中心）
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // 矩形の4辺との交差判定
    const w = rect.width / 2;
    const h = rect.height / 2;

    // 中心からの相対座標で計算
    // 直線の方程式: y = (dy/dx) * x

    if (dx === 0 && dy === 0) return p2;

    const slope = dy / dx;

    // 左右の辺との交点候補
    // x = w のとき y = slope * w
    // x = -w のとき y = slope * -w

    // 上下の辺との交点候補
    // y = h のとき x = h / slope
    // y = -h のとき x = -h / slope

    let ix, iy;

    if (Math.abs(dy * w) > Math.abs(dx * h)) {
      // 上下の辺と交差
      if (dy > 0) { // 下方向（Sourceが上） -> 上辺と交差
        iy = -h;
        ix = -h / slope;
      } else { // 上方向（Sourceが下） -> 下辺と交差
        iy = h;
        ix = h / slope;
      }
    } else {
      // 左右の辺と交差
      if (dx > 0) { // 右方向（Sourceが左） -> 左辺と交差
        ix = -w;
        iy = slope * -w;
      } else { // 左方向（Sourceが右） -> 右辺と交差
        ix = w;
        iy = slope * w;
      }
    }

    return { x: rect.x + ix, y: rect.y + iy };
  };

  // エッジのパス計算（ベジェ曲線 + 交点計算）
  const getEdgePath = (source: DependencyNode, target: DependencyNode, isBidirectional: boolean) => {
    const sx = source.x || 0;
    const sy = source.y || 0;
    const tx = target.x || 0;
    const ty = target.y || 0;

    const targetSize = getNodeSize(target.label);
    const targetRect = { x: tx, y: ty, width: targetSize.width, height: targetSize.height };

    if (!isBidirectional) {
      // 直線の場合、始点から終点へのベクトルで交点を計算
      const intersection = getRectIntersection({ x: sx, y: sy }, { x: tx, y: ty }, targetRect);
      return `M ${sx} ${sy} L ${intersection.x} ${intersection.y}`;
    } else {
      // 双方向（カーブ）の場合
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;
      const offset = 40; // カーブの深さ
      const cx = mx + nx * offset;
      const cy = my + ny * offset;

      // 制御点から終点へのベクトルで交点を計算
      const intersection = getRectIntersection({ x: cx, y: cy }, { x: tx, y: ty }, targetRect);

      return `M ${sx} ${sy} Q ${cx} ${cy} ${intersection.x} ${intersection.y}`;
    }
  };

  return (
    <div className={styles.container} role="region" aria-label="依存関係マッピング" data-testid="dep-map-container">
      {/* Canvas */}
      <div className={styles.canvasArea} style={{ cursor: connectionStart ? 'grabbing' : 'default' }} onClick={handleCanvasClick}>
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
                refX="9" // ノード境界ぴったりにするため調整（線幅考慮）
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
              refX="9"
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
            // isCritical removed to fix lint and unstable width issue
            const isSelected = state.selectedEdgeId === edge.id;
            const pathD = getEdgePath(source, target, isBidirectional);

            return (
              <g key={edge.id} className={styles.edgeGroup} onClick={(e) => handleEdgeClick(e, edge.id)}>
                {/* Hit area (thicker transparent line) */}
                <path
                  d={pathD}
                  stroke="transparent"
                  strokeWidth="20"
                  fill="none"
                  style={{ cursor: 'pointer' }}
                />
                {/* Selection Glow */}
                {isSelected && (
                  <path
                    d={pathD}
                    stroke="#fbbf24" // Amber-400
                    strokeWidth="6"
                    fill="none"
                    opacity="0.5"
                  />
                )}
                {/* Visible line */}
                <path
                  d={pathD}
                  stroke={EDGE_TYPE_COLORS[edge.type]}
                  strokeWidth={2} // Fixed width to prevent "unstable" look
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
                className={`${styles.nodeGroup} ${isSelected ? styles.selected : ''}`}
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

                {/* Connection Handles (Visible on Hover) */}
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

        {/* Floating Toolbar (Vertical, Right Side) */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-xl p-2 flex flex-col items-center gap-3 border border-gray-200">
          <button
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors relative group"
            onClick={handleAddNode}
          >
            <span className="text-xl font-bold">+</span>
            {/* Tooltip */}
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
              ノード追加
            </span>
          </button>

          <div className="w-8 h-px bg-gray-200"></div>

          {/* Edge Type Selector */}
          <div className="flex flex-col gap-2">
            {(Object.keys(EDGE_TYPE_COLORS) as DependencyEdge['type'][]).map((type) => {
              const isActive = state.selectedEdgeId
                ? state.edges.find(e => e.id === state.selectedEdgeId)?.type === type
                : currentEdgeType === type;

              return (
                <button
                  key={type}
                  className={`w-8 h-8 rounded-full border-2 transition-all relative group ${isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    backgroundColor: EDGE_TYPE_COLORS[type],
                    borderColor: isActive ? 'white' : 'white',
                    boxShadow: isActive ? `0 0 0 2px white, 0 0 0 4px ${EDGE_TYPE_COLORS[type]}` : '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => handleEdgeTypeChange(type)}
                >
                  {/* Tooltip */}
                  <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
                    {EDGE_TYPE_LABELS[type]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-8 h-px bg-gray-200"></div>

          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-30 disabled:hover:bg-transparent relative group"
            onClick={handleDelete}
            disabled={!state.selectedNodeId && !state.selectedEdgeId}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {/* Tooltip */}
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
              削除
            </span>
          </button>

          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors relative group"
            onClick={handleReset}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {/* Tooltip */}
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
              初めから
            </span>
          </button>
        </div>

        {/* Complete Button (Bottom Right) */}
        <div className="absolute bottom-4 right-4">
          <button
            className="bg-blue-600 text-white text-sm px-6 py-2 rounded-full hover:bg-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            完了
          </button>
        </div>
      </div>

      {/* Legend / Info (Optional, kept minimal) */}
      <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-lg shadow-sm border border-gray-100 text-xs pointer-events-none">
        <div className="font-bold mb-1">操作ガイド</div>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>ドラッグ: ノード移動</li>
          <li>青い点ドラッグ: 接続</li>
          <li>ダブルクリック: 名前変更</li>
          <li>クリック: 選択 (削除/色変更)</li>
        </ul>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-xl">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                onClick={confirmDialog.onConfirm}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyMapping;
