/**
 * TimelineSliderController.test.ts
 * TimelineSliderControllerの単体テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  TimelineSliderController,
  TIME_UNIT_CONFIG,
  PRIORITY_COLORS,
} from '../TimelineSliderController';

describe('TimelineSliderController', () => {
  let controller: TimelineSliderController;

  beforeEach(() => {
    controller = new TimelineSliderController();
  });

  describe('初期化', () => {
    test('デフォルトで週単位で初期化される', () => {
      const state = controller.getState();

      expect(state.timeUnit).toBe('weeks');
      expect(state.events).toEqual([]);
      expect(state.selectedEventId).toBeNull();
    });

    test('カスタム時間単位で初期化できる', () => {
      const monthController = new TimelineSliderController('months');
      const state = monthController.getState();

      expect(state.timeUnit).toBe('months');
      expect(state.startLabel).toBe('今月');
    });
  });

  describe('時間単位設定', () => {
    test('時間単位を変更できる', () => {
      controller.setTimeUnit('days');
      const state = controller.getState();

      expect(state.timeUnit).toBe('days');
      expect(state.startLabel).toBe('今日');
    });

    test('ラベルが更新される', () => {
      controller.setTimeUnit('years');
      const state = controller.getState();

      expect(state.startLabel).toBe('今年');
      expect(state.endLabel).toBe('4年後');
    });
  });

  describe('イベント追加', () => {
    test('イベントを追加できる', () => {
      const event = controller.addEvent('テストイベント', 50);

      expect(event.text).toBe('テストイベント');
      expect(event.position).toBe(50);
      expect(event.priority).toBe('medium');
      expect(event.color).toBe(PRIORITY_COLORS.medium);
    });

    test('優先度を指定できる', () => {
      const event = controller.addEvent('高優先度', 30, 'high');

      expect(event.priority).toBe('high');
      expect(event.color).toBe(PRIORITY_COLORS.high);
    });

    test('期間を指定できる', () => {
      const event = controller.addEvent('期間付き', 20, 'medium', 30);

      expect(event.duration).toBe(30);
    });

    test('位置は0-100に制限される', () => {
      const negative = controller.addEvent('負', -10);
      const over = controller.addEvent('超過', 150);

      expect(negative.position).toBe(0);
      expect(over.position).toBe(100);
    });

    test('期間は残り範囲に制限される', () => {
      const event = controller.addEvent('長期間', 80, 'medium', 50);

      expect(event.duration).toBe(20); // 100 - 80 = 20
    });
  });

  describe('イベント更新', () => {
    test('イベントのテキストを更新できる', () => {
      const event = controller.addEvent('元のテキスト', 50);
      controller.updateEvent(event.id, { text: '更新後' });

      const state = controller.getState();
      const updated = state.events.find((e) => e.id === event.id);

      expect(updated?.text).toBe('更新後');
    });

    test('優先度更新で色も更新される', () => {
      const event = controller.addEvent('テスト', 50, 'low');
      controller.updateEvent(event.id, { priority: 'high' });

      const state = controller.getState();
      const updated = state.events.find((e) => e.id === event.id);

      expect(updated?.priority).toBe('high');
      expect(updated?.color).toBe(PRIORITY_COLORS.high);
    });

    test('存在しないイベントはエラー', () => {
      expect(() => {
        controller.updateEvent('non_existent', { text: 'テスト' });
      }).toThrow('Event not found');
    });
  });

  describe('イベント位置更新', () => {
    test('イベントの位置を更新できる', () => {
      const event = controller.addEvent('テスト', 30);
      controller.setEventPosition(event.id, 70);

      const state = controller.getState();
      const updated = state.events.find((e) => e.id === event.id);

      expect(updated?.position).toBe(70);
    });
  });

  describe('イベント削除', () => {
    test('イベントを削除できる', () => {
      const event = controller.addEvent('削除予定', 50);
      controller.removeEvent(event.id);

      const state = controller.getState();
      expect(state.events).toHaveLength(0);
    });

    test('選択中のイベントを削除すると選択解除される', () => {
      const event = controller.addEvent('選択イベント', 50);
      controller.selectEvent(event.id);
      controller.removeEvent(event.id);

      const state = controller.getState();
      expect(state.selectedEventId).toBeNull();
    });
  });

  describe('イベント選択', () => {
    test('イベントを選択できる', () => {
      const event = controller.addEvent('選択対象', 50);
      controller.selectEvent(event.id);

      const state = controller.getState();
      expect(state.selectedEventId).toBe(event.id);
    });

    test('選択を解除できる', () => {
      const event = controller.addEvent('選択対象', 50);
      controller.selectEvent(event.id);
      controller.selectEvent(null);

      const state = controller.getState();
      expect(state.selectedEventId).toBeNull();
    });
  });

  describe('位置ラベル取得', () => {
    test('位置からラベルを取得できる', () => {
      const label = controller.getPositionLabel(0);
      expect(label).toBe('今週');

      const label100 = controller.getPositionLabel(100);
      expect(label100).toBe('3週間後');
    });

    test('中間位置のラベルを取得できる', () => {
      const label = controller.getPositionLabel(50);
      // 50%は4つのマーカーの中間
      expect(label).toBeDefined();
    });
  });

  describe('ソート済みイベント取得', () => {
    test('位置順にソートされる', () => {
      controller.addEvent('後', 80);
      controller.addEvent('先', 20);
      controller.addEvent('中', 50);

      const sorted = controller.getSortedEvents();

      expect(sorted[0].text).toBe('先');
      expect(sorted[1].text).toBe('中');
      expect(sorted[2].text).toBe('後');
    });
  });

  describe('優先度フィルタ', () => {
    test('優先度でフィルタできる', () => {
      controller.addEvent('高1', 20, 'high');
      controller.addEvent('中1', 40, 'medium');
      controller.addEvent('高2', 60, 'high');
      controller.addEvent('低1', 80, 'low');

      const high = controller.getEventsByPriority('high');

      expect(high).toHaveLength(2);
    });
  });

  describe('範囲フィルタ', () => {
    test('時間範囲でフィルタできる', () => {
      controller.addEvent('範囲外', 10);
      controller.addEvent('範囲内1', 30);
      controller.addEvent('範囲内2', 50);
      controller.addEvent('範囲外', 90);

      const inRange = controller.getEventsInRange(25, 55);

      expect(inRange).toHaveLength(2);
    });
  });

  describe('サマリー生成', () => {
    test('イベントがない場合', () => {
      const summary = controller.generateSummary();

      expect(summary).toContain('追加してください');
    });

    test('イベントがある場合', () => {
      controller.addEvent('イベント1', 30);
      controller.addEvent('イベント2', 60);

      const summary = controller.generateSummary();

      expect(summary).toContain('2個のイベント');
      expect(summary).toContain('週単位');
    });

    test('高優先度がある場合', () => {
      controller.addEvent('通常', 30);
      controller.addEvent('高優先度', 60, 'high');

      const summary = controller.generateSummary();

      expect(summary).toContain('高優先度: 1件');
    });
  });

  describe('WidgetResult生成', () => {
    test('基本的な結果を返す', () => {
      const result = controller.getResult('widget_1');

      expect(result.widgetId).toBe('widget_1');
      expect(result.component).toBe('timeline_slider');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.data.type).toBe('ranking');
    });

    test('イベント情報が含まれる', () => {
      controller.addEvent('イベント1', 30, 'high');
      controller.addEvent('イベント2', 60);

      const result = controller.getResult('widget_1');

      expect(result.data.ranking?.items).toHaveLength(2);
      // 位置順にソートされている
      expect(result.data.ranking?.items[0].label).toBe('イベント1');
    });

    test('統計情報が含まれる', () => {
      controller.addEvent('高', 30, 'high');
      controller.addEvent('中', 60, 'medium');

      const result = controller.getResult('widget_1');

      expect(result.data.composite?.statistics?.totalEvents).toBe(2);
      expect(result.data.composite?.statistics?.byPriority?.high).toBe(1);
      expect(result.data.composite?.statistics?.byPriority?.medium).toBe(1);
    });

    test('メタデータが含まれる', () => {
      controller.addEvent('テスト', 50);

      const result = controller.getResult('widget_1');

      expect(result.metadata?.eventCount).toBe(1);
      expect(result.metadata?.timeUnit).toBe('weeks');
    });
  });

  describe('リセット', () => {
    test('リセット後は初期状態に戻る', () => {
      controller.addEvent('イベント1', 30);
      controller.addEvent('イベント2', 60);
      controller.selectEvent(controller.getState().events[0].id);

      controller.reset();

      const state = controller.getState();
      expect(state.events).toEqual([]);
      expect(state.selectedEventId).toBeNull();
    });
  });
});
