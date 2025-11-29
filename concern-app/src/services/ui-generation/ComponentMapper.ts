/**
 * ComponentMapper
 * DSL→Reactコンポーネント変換の骨格
 * 
 * Phase 1C - C1タスク
 */

import type { RenderSpec, SVALRenderSpec, ARRYRenderSpec, PNTRRenderSpec, CUSTOMRenderSpec } from '../../../../server/src/types/UISpecDSL';

/**
 * render値からコンポーネント名へのマッピング
 */
export const RENDER_TO_COMPONENT_MAP: Record<string, string> = {
  // SVAL系
  paragraph: 'TextAreaWidget',
  shortText: 'InputWidget',
  number: 'NumberInputWidget',
  radio: 'RadioGroupWidget',
  category: 'CategoryPickerWidget',
  hidden: 'HiddenWidget',

  // ARRY系
  expanded: 'ListWidget',
  summary: 'SummaryListWidget',

  // PNTR系
  link: 'LinkWidget',
  inline: 'InlineWidget',
  card: 'CardWidget',

  // CUSTOM系
  custom: 'DynamicWidget'
};

/**
 * サリエンシーレベルに応じたスタイルクラス定義
 * Jelly論文のサリエンシー概念を実装
 */
export const SALIENCY_STYLES: Record<number, string> = {
  0: 'bg-neutral-50 text-neutral-600 border-neutral-200',  // base (unused)
  1: 'bg-blue-50 text-blue-800 border-blue-200',           // emphasis (prepare_step)
  2: 'bg-blue-100 text-blue-900 border-blue-300 font-semibold', // primary (standard)
  3: 'bg-red-100 text-red-900 border-red-400 font-bold animate-pulse' // urgent
};

/**
 * ComponentMapperクラス
 * RenderSpecをReactコンポーネントに変換する
 */
export class ComponentMapper {
  /**
   * コンストラクタ
   */
  constructor() {
    // 初期化処理（現時点では空）
  }

  /**
   * サリエンシーレベルに応じたTailwind CSSクラスを適用
   * @param saliency サリエンシーレベル（0-3）
   * @returns Tailwind CSSクラス文字列
   */
  applySaliencyStyle(saliency: number): string {
    // 範囲チェック
    if (saliency < 0 || saliency > 3) {
      console.warn(`Invalid saliency level: ${saliency}, using default (2)`);
      return SALIENCY_STYLES[2];
    }

    return SALIENCY_STYLES[saliency] || SALIENCY_STYLES[2];
  }

  /**
   * render値からコンポーネント名を取得
   * @param renderType render値
   * @returns コンポーネント名
   */
  getComponentName(renderType: string): string {
    const componentName = RENDER_TO_COMPONENT_MAP[renderType];

    if (!componentName) {
      console.warn(`Unknown render type: ${renderType}, falling back to TextAreaWidget`);
      return 'TextAreaWidget';
    }

    return componentName;
  }

  /**
   * RenderSpecからコンポーネント情報を取得
   * @param renderSpec RenderSpec
   * @param data データ値
   * @param onChange 変更ハンドラー
   * @returns コンポーネント情報
   */
  getComponentInfo(
    renderSpec: RenderSpec,
    data: any,
    onChange?: (value: any) => void
  ): {
    componentName: string;
    props: Record<string, any>;
  } {
    const componentName = this.getComponentName(renderSpec.render);

    // 型別にpropsを構築
    let props: Record<string, any> = {
      value: data,
      onChange
    };

    // SVALRenderSpec
    if (this.isSVALRenderSpec(renderSpec)) {
      props = {
        ...props,
        editable: renderSpec.editable,
        placeholder: renderSpec.placeholder,
      };

      // category専用
      if (renderSpec.render === 'category' && renderSpec.categories) {
        props.categories = renderSpec.categories;
        props.selected = data;
      }

      // radio専用
      if (renderSpec.render === 'radio' && renderSpec.categories) {
        props.options = renderSpec.categories;
      }
    }

    // ARRYRenderSpec
    else if (this.isARRYRenderSpec(renderSpec)) {
      props = {
        ...props,
        items: Array.isArray(data) ? data : [],
        editable: renderSpec.editable,
        reorderable: renderSpec.reorderable,
      };

      // summary専用
      if (renderSpec.render === 'summary' && renderSpec.summary) {
        props.summaryName = renderSpec.summary.name;
        props.summaryValue = this.calculateSummary(data, renderSpec.summary.derived);
      }
    }

    // PNTRRenderSpec
    else if (this.isPNTRRenderSpec(renderSpec)) {
      props = {
        ...props,
        editable: renderSpec.editable,
        thumbnail: renderSpec.thumbnail,
      };
    }

    // CUSTOMRenderSpec
    else if (this.isCUSTOMRenderSpec(renderSpec)) {
      props = {
        ...props,
        component: renderSpec.component,
        ...(renderSpec.props || {}),
      };
    }

    return {
      componentName,
      props
    };
  }

  /**
   * summaryの集計値を計算
   */
  private calculateSummary(
    items: any[],
    derived: { operation: string; field?: string }
  ): number | string {
    if (!Array.isArray(items) || items.length === 0) {
      return derived.operation === 'COUNT' ? 0 : '-';
    }

    switch (derived.operation) {
      case 'COUNT':
        return items.length;

      case 'SUM':
        if (!derived.field) return 0;
        return items.reduce((sum, item) => sum + (item[derived.field!] || 0), 0);

      case 'AVG':
        if (!derived.field) return 0;
        const sum = items.reduce((s, item) => s + (item[derived.field!] || 0), 0);
        return sum / items.length;

      case 'MIN':
        if (!derived.field) return 0;
        return Math.min(...items.map(item => item[derived.field!] || 0));

      case 'MAX':
        if (!derived.field) return 0;
        return Math.max(...items.map(item => item[derived.field!] || 0));

      default:
        return '-';
    }
  }

  /**
   * SVALRenderSpecの型判定
   */
  isSVALRenderSpec(renderSpec: RenderSpec): renderSpec is SVALRenderSpec {
    return ['paragraph', 'shortText', 'number', 'radio', 'category', 'hidden'].includes(renderSpec.render);
  }

  /**
   * ARRYRenderSpecの型判定
   */
  isARRYRenderSpec(renderSpec: RenderSpec): renderSpec is ARRYRenderSpec {
    return ['expanded', 'summary'].includes(renderSpec.render);
  }

  /**
   * PNTRRenderSpecの型判定
   */
  isPNTRRenderSpec(renderSpec: RenderSpec): renderSpec is PNTRRenderSpec {
    return ['link', 'inline', 'card'].includes(renderSpec.render);
  }

  /**
   * CUSTOMRenderSpecの型判定
   */
  isCUSTOMRenderSpec(renderSpec: RenderSpec): renderSpec is CUSTOMRenderSpec {
    return renderSpec.render === 'custom';
  }
}
