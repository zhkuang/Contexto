"use strict";
// 数据类型定义
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectStatus = exports.KeyStatus = void 0;
// Key状态
var KeyStatus;
(function (KeyStatus) {
    KeyStatus["NEW"] = "new";
    KeyStatus["UPDATED"] = "updated";
    KeyStatus["PENDING"] = "pending";
    KeyStatus["OBSOLETE"] = "obsolete";
})(KeyStatus = exports.KeyStatus || (exports.KeyStatus = {}));
// 项目状态
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["UNINITIALIZED"] = "uninitialized";
    ProjectStatus["CONFIG_ERROR"] = "config_error";
    ProjectStatus["INITIALIZED"] = "initialized";
})(ProjectStatus = exports.ProjectStatus || (exports.ProjectStatus = {}));
//# sourceMappingURL=types.js.map