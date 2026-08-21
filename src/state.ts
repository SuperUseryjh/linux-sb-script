import { Settings } from './types';
import { DEFAULTS } from './constants';

// 全局设置对象：main.ts 启动时通过 loadSettings() 覆盖为已保存的配置。
// 各模块直接读写此对象属性（不做整体重赋值，重置设置时用 Object.assign 原地更新）。
export const settings: Settings = Object.assign({}, DEFAULTS);

// 界面元素：由 interface.ts 的 ensureInterface() 创建并挂载。
export const ui: {
    panel: any;
    toggleButton: any;
} = {
    panel: null,
    toggleButton: null
};
