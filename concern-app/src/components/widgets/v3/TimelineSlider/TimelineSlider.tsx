/**
 * TimelineSlider.tsx
 * 時間軸スライダーWidget
 *
 * Phase 4 - DSL v3 - Widget実装
 * タスクやイベントを時間軸上に配置するWidget
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseWidgetProps } from '../../../../types/widget.types';
import type { WidgetResult } from '../../../../types/result.types';
import {
  TimelineSliderController,
  TIME_UNIT_CONFIG,
  PRIORITY_COLORS,
  type TimeUnit,
  type TimelineEvent,
} from './TimelineSliderController';
import { useReactivePorts } from '../../../../hooks/useReactivePorts';
import styles from './TimelineSlider.module.css';

/**
 * TimelineSlider Component
 */
export const TimelineSlider: React.FC<BaseWidgetProps> = ({
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
  const [newEventText, setNewEventText] = useState('');
  const [newEventPosition, setNewEventPosition] = useState(50);
  const [newEventPriority, setNewEventPriority] = useState<TimelineEvent['priority']>('medium');
  const controllerRef = useRef<TimelineSliderController>(
    new TimelineSliderController(spec.config.timeUnit || 'weeks')
  );

  // configから初期イベントを設定
  useEffect(() => {
    const initialEvents = spec.config.events as Array<{
      text: string;
      position: number;
      priority?: TimelineEvent['priority'];
    }> | undefined;

    if (initialEvents && initialEvents.length > 0) {
      controllerRef.current.reset();
      initialEvents.forEach((event) => {
        controllerRef.current.addEvent(
          event.text,
          event.position,
          event.priority || 'medium'
        );
      });
      forceUpdate({});
    }
  }, [spec.config.events]);

  const state = controllerRef.current.getState();
  const sortedEvents = controllerRef.current.getSortedEvents();
  const config = TIME_UNIT_CONFIG[state.timeUnit];

  /**
   * 全出力Portに値を発行
   */
  const emitAllPorts = useCallback(() => {
    emitPort('events', controllerRef.current.getSortedEvents());
    emitPort('summary', controllerRef.current.generateSummary());
  }, [emitPort]);

  /**
   * 時間単位変更
   */
  const handleTimeUnitChange = useCallback(
    (unit: TimeUnit) => {
      controllerRef.current.setTimeUnit(unit);
      forceUpdate({});
      // Reactive Port出力
      emitAllPorts();
    },
    [emitAllPorts]
  );

  /**
   * イベント追加
   */
  const handleAddEvent = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEventText.trim()) return;

      controllerRef.current.addEvent(
        newEventText.trim(),
        newEventPosition,
        newEventPriority
      );
      setNewEventText('');
      setNewEventPosition(50);
      forceUpdate({});

      // Reactive Port出力
      emitAllPorts();

      if (onUpdate) {
        const result = controllerRef.current.getResult(spec.id);
        onUpdate(spec.id, result.data);
      }
    },
    [newEventText, newEventPosition, newEventPriority, emitAllPorts, onUpdate, spec.id]
  );

  /**
   * イベント位置更新
   */
  const handleEventPositionChange = useCallback(
    (eventId: string, position: number) => {
      controllerRef.current.setEventPosition(eventId, position);
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
   * イベント選択
   */
  const handleSelectEvent = useCallback((eventId: string | null) => {
    controllerRef.current.selectEvent(eventId);
    forceUpdate({});
  }, []);

  /**
   * イベント削除
   */
  const handleRemoveEvent = useCallback(
    (eventId: string) => {
      controllerRef.current.removeEvent(eventId);
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
   * リセット
   */
  const handleReset = useCallback(() => {
    controllerRef.current.reset();
    setNewEventText('');
    setNewEventPosition(50);
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
    if (sortedEvents.length === 0) {
      setError(true, ['イベントを追加してください']);
      return;
    }

    setError(false);
    setCompleted(true);

    if (onComplete) {
      onComplete(spec.id);
    }
  }, [sortedEvents.length, setError, setCompleted, onComplete, spec.id]);

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
    <div className={styles.container} role="region" aria-label="タイムライン" data-testid="timeline-container">
      <div className={styles.header}>
        <h2 className={styles.title}>
          {spec.config.title || '時間軸スライダー'}
        </h2>
        <p className={styles.description}>
          {spec.config.description || 'タスクやイベントを時間軸上に配置してください'}
        </p>
      </div>

      {/* Time unit selector */}
      <div className={styles.timeUnitSelector}>
        {(Object.keys(TIME_UNIT_CONFIG) as TimeUnit[]).map((unit) => (
          <button
            key={unit}
            className={`${styles.timeUnitButton} ${state.timeUnit === unit ? styles.timeUnitButtonActive : ''
              }`}
            onClick={() => handleTimeUnitChange(unit)}
            data-testid={`timeline-unit-${unit}`}
          >
            {TIME_UNIT_CONFIG[unit].label}
          </button>
        ))}
      </div>

      {/* Timeline area */}
      <div className={styles.timelineArea} data-testid="timeline-track">
        <div className={styles.timelineTrack}>
          <div className={styles.trackLine} />

          {/* Markers */}
          <div className={styles.markersContainer}>
            {config.markerLabels.map((label, index) => (
              <div key={index} className={styles.marker}>
                <span className={styles.markerLabel}>{label}</span>
                <div className={styles.markerDot} />
              </div>
            ))}
          </div>

          {/* Events on timeline */}
          <div className={styles.eventsOnTimeline}>
            {sortedEvents.map((event, index) => (
              <div
                key={event.id}
                className={`${styles.eventMarker} ${state.selectedEventId === event.id
                  ? styles.eventMarkerSelected
                  : ''
                  }`}
                style={{ left: `${event.position}%` }}
                onClick={() => handleSelectEvent(event.id)}
                data-testid={`timeline-marker-${event.id}`}
              >
                <div className={styles.eventLabel}>{event.text}</div>
                <div
                  className={styles.eventDot}
                  style={{ backgroundColor: event.color }}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add event form */}
        <form className={styles.addEventForm} onSubmit={handleAddEvent}>
          <input
            type="text"
            className={styles.eventInput}
            value={newEventText}
            onChange={(e) => setNewEventText(e.target.value)}
            placeholder="イベント名を入力..."
            data-testid="timeline-input"
          />
          <input
            type="range"
            className={styles.positionSlider}
            min="0"
            max="100"
            value={newEventPosition}
            onChange={(e) => setNewEventPosition(Number(e.target.value))}
            title={controllerRef.current.getPositionLabel(newEventPosition)}
            data-testid="timeline-position-slider"
          />
          <select
            className={styles.prioritySelect}
            value={newEventPriority}
            onChange={(e) =>
              setNewEventPriority(e.target.value as TimelineEvent['priority'])
            }
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <button type="submit" className={styles.addButton} data-testid="timeline-add-btn">
            追加
          </button>
        </form>
      </div>

      {/* Events list */}
      <div className={styles.eventsList}>
        <h3 className={styles.eventsListTitle}>
          イベント一覧（{sortedEvents.length}件）
        </h3>
        {sortedEvents.length === 0 ? (
          <div className={styles.emptyState}>
            タイムラインにイベントを追加してください
          </div>
        ) : (
          <div className={styles.eventsGrid}>
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className={`${styles.eventItem} ${state.selectedEventId === event.id
                  ? styles.eventItemSelected
                  : ''
                  }`}
                style={{ borderLeftColor: event.color }}
                onClick={() => handleSelectEvent(event.id)}
                data-testid={`timeline-item-${event.id}`}
              >
                <div
                  className={styles.eventPriorityDot}
                  style={{ backgroundColor: event.color }}
                />
                <span className={styles.eventItemText}>{event.text}</span>
                <span className={styles.eventItemPosition}>
                  {controllerRef.current.getPositionLabel(event.position)}
                </span>
                <input
                  type="range"
                  className={styles.eventItemSlider}
                  min="0"
                  max="100"
                  value={event.position}
                  onChange={(e) =>
                    handleEventPositionChange(event.id, Number(e.target.value))
                  }
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`timeline-item-slider-${event.id}`}
                />
                <button
                  className={styles.eventDeleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveEvent(event.id);
                  }}
                  data-testid={`timeline-delete-${event.id}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {(Object.keys(PRIORITY_COLORS) as TimelineEvent['priority'][]).map(
          (priority) => (
            <div key={priority} className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: PRIORITY_COLORS[priority] }}
              />
              <span>
                {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}優先度
              </span>
            </div>
          )
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.resetButton} onClick={handleReset}>
          リセット
        </button>
        <button
          className={styles.completeButton}
          onClick={handleComplete}
          disabled={sortedEvents.length === 0}
          data-testid="timeline-complete-btn"
        >
          {sortedEvents.length > 0 ? '完了' : 'イベントを追加してください'}
        </button>
      </div>
    </div>
  );
};

export default TimelineSlider;
