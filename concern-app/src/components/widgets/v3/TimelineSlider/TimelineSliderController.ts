/**
 * TimelineSliderController.ts
 * 時間軸スライダーWidgetのロジック層
 *
 * Phase 4 - DSL v3 - Widget実装
 * タスクやイベントを時間軸上に配置するWidgetのコントローラー
 */

import type { WidgetResult } from '../../../../types/result.types';

/**
 * タイムラインイベントの定義
 */
export interface TimelineEvent {
  id: string;
  text: string;
  position: number; // 0-100 (timeline position)
  duration?: number; // optional duration (0-100 range from position)
  color?: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * タイムラインの単位
 */
export type TimeUnit = 'days' | 'weeks' | 'months' | 'quarters' | 'years';

/**
 * TimelineSliderの状態
 */
export interface TimelineSliderState {
  events: TimelineEvent[];
  timeUnit: TimeUnit;
  startLabel: string;
  endLabel: string;
  selectedEventId: string | null;
}

/**
 * 時間単位の設定
 */
export const TIME_UNIT_CONFIG: Record<
  TimeUnit,
  { label: string; markers: number; markerLabels: string[] }
> = {
  days: {
    label: '日',
    markers: 7,
    markerLabels: ['今日', '明日', '2日後', '3日後', '4日後', '5日後', '1週間後'],
  },
  weeks: {
    label: '週',
    markers: 4,
    markerLabels: ['今週', '来週', '2週間後', '3週間後'],
  },
  months: {
    label: '月',
    markers: 6,
    markerLabels: ['今月', '来月', '2ヶ月後', '3ヶ月後', '4ヶ月後', '半年後'],
  },
  quarters: {
    label: '四半期',
    markers: 4,
    markerLabels: ['今四半期', '次四半期', '2Q後', '3Q後'],
  },
  years: {
    label: '年',
    markers: 5,
    markerLabels: ['今年', '来年', '2年後', '3年後', '4年後'],
  },
};

/**
 * 優先度の色
 */
export const PRIORITY_COLORS: Record<TimelineEvent['priority'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

/**
 * TimelineSliderController
 * 時間軸スライダーのロジック管理
 */
export class TimelineSliderController {
  private state: TimelineSliderState;
  private eventIdCounter: number = 0;

  constructor(timeUnit: TimeUnit = 'weeks') {
    const config = TIME_UNIT_CONFIG[timeUnit];
    this.state = {
      events: [],
      timeUnit,
      startLabel: config.markerLabels[0],
      endLabel: config.markerLabels[config.markerLabels.length - 1],
      selectedEventId: null,
    };
  }

  /**
   * 時間単位を設定
   */
  public setTimeUnit(unit: TimeUnit): void {
    this.state.timeUnit = unit;
    const config = TIME_UNIT_CONFIG[unit];
    this.state.startLabel = config.markerLabels[0];
    this.state.endLabel = config.markerLabels[config.markerLabels.length - 1];
  }

  /**
   * イベントを追加
   */
  public addEvent(
    text: string,
    position: number,
    priority: TimelineEvent['priority'] = 'medium',
    duration?: number
  ): TimelineEvent {
    const event: TimelineEvent = {
      id: `timeline_event_${++this.eventIdCounter}`,
      text,
      position: Math.max(0, Math.min(100, position)),
      duration: duration ? Math.max(0, Math.min(100 - position, duration)) : undefined,
      priority,
      color: PRIORITY_COLORS[priority],
    };
    this.state.events.push(event);
    return event;
  }

  /**
   * イベントを更新
   */
  public updateEvent(
    eventId: string,
    updates: Partial<Omit<TimelineEvent, 'id'>>
  ): void {
    const event = this.state.events.find((e) => e.id === eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    if (updates.position !== undefined) {
      updates.position = Math.max(0, Math.min(100, updates.position));
    }
    if (updates.priority !== undefined) {
      updates.color = PRIORITY_COLORS[updates.priority];
    }
    Object.assign(event, updates);
  }

  /**
   * イベントの位置を更新
   */
  public setEventPosition(eventId: string, position: number): void {
    this.updateEvent(eventId, { position });
  }

  /**
   * イベントを削除
   */
  public removeEvent(eventId: string): void {
    this.state.events = this.state.events.filter((e) => e.id !== eventId);
    if (this.state.selectedEventId === eventId) {
      this.state.selectedEventId = null;
    }
  }

  /**
   * イベントを選択
   */
  public selectEvent(eventId: string | null): void {
    this.state.selectedEventId = eventId;
  }

  /**
   * 位置からラベルを取得
   */
  public getPositionLabel(position: number): string {
    const config = TIME_UNIT_CONFIG[this.state.timeUnit];
    const index = Math.round((position / 100) * (config.markerLabels.length - 1));
    return config.markerLabels[index] || '';
  }

  /**
   * イベントを位置順にソート
   */
  public getSortedEvents(): TimelineEvent[] {
    return [...this.state.events].sort((a, b) => a.position - b.position);
  }

  /**
   * 優先度でフィルタ
   */
  public getEventsByPriority(priority: TimelineEvent['priority']): TimelineEvent[] {
    return this.state.events.filter((e) => e.priority === priority);
  }

  /**
   * 時間範囲内のイベントを取得
   */
  public getEventsInRange(start: number, end: number): TimelineEvent[] {
    return this.state.events.filter(
      (e) => e.position >= start && e.position <= end
    );
  }

  /**
   * 現在の状態を取得
   */
  public getState(): TimelineSliderState {
    return { ...this.state };
  }

  /**
   * サマリーテキストを生成
   */
  public generateSummary(): string {
    const count = this.state.events.length;
    if (count === 0) {
      return 'タイムラインにイベントを追加してください';
    }

    const highPriority = this.getEventsByPriority('high').length;
    const config = TIME_UNIT_CONFIG[this.state.timeUnit];

    let summary = `${count}個のイベントを${config.label}単位で配置`;
    if (highPriority > 0) {
      summary += `（高優先度: ${highPriority}件）`;
    }

    return summary;
  }

  /**
   * WidgetResultを生成
   */
  public getResult(widgetId: string): WidgetResult {
    const sortedEvents = this.getSortedEvents();
    const config = TIME_UNIT_CONFIG[this.state.timeUnit];

    return {
      widgetId,
      component: 'timeline_slider',
      timestamp: Date.now(),
      summary: this.generateSummary(),
      data: {
        type: 'ranking',
        ranking: {
          items: sortedEvents.map((event, index) => ({
            id: event.id,
            label: event.text,
            score: event.position,
            metadata: {
              priority: event.priority,
              positionLabel: this.getPositionLabel(event.position),
              order: index + 1,
            },
          })),
        },
        composite: {
          timeUnit: this.state.timeUnit,
          timeUnitLabel: config.label,
          events: sortedEvents.map((event) => ({
            ...event,
            positionLabel: this.getPositionLabel(event.position),
          })),
          statistics: {
            totalEvents: this.state.events.length,
            byPriority: {
              high: this.getEventsByPriority('high').length,
              medium: this.getEventsByPriority('medium').length,
              low: this.getEventsByPriority('low').length,
            },
            earliestPosition:
              sortedEvents.length > 0 ? sortedEvents[0].position : null,
            latestPosition:
              sortedEvents.length > 0
                ? sortedEvents[sortedEvents.length - 1].position
                : null,
          },
        },
      },
      interactions: [],
      metadata: {
        eventCount: this.state.events.length,
        timeUnit: this.state.timeUnit,
      },
    };
  }

  /**
   * リセット
   */
  public reset(): void {
    this.state.events = [];
    this.state.selectedEventId = null;
    this.eventIdCounter = 0;
  }
}
