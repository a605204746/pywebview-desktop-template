"""JS ↔ Python 桥接层

在此类中添加 public 方法，前端通过 bridge.call('方法名', 参数) 即可调用。
返回值统一用 {"success": bool, "data": any} 格式，方便前端统一处理。

前端调用示例：
    import { call } from '../bridge'
    const { success, data } = await call('get_app_info')

扩展说明：
    - 系统信息 / 开机自启 → api/system.py (SystemMixin)
    - 文件 / 文件夹操作  → api/file.py    (FileMixin)
    - 本地键值存储       → api/storage.py (StorageMixin)
    - Shell / 系统交互   → api/shell.py   (ShellMixin)
    - 新增业务模块       → 新建 api/xxx.py，继承 Mixin，加入 Api 的基类列表
"""
from .file import FileMixin
from .license import LicenseMixin
from .shell import ShellMixin
from .storage import StorageMixin
from .system import SystemMixin


class Api(LicenseMixin, SystemMixin, FileMixin, StorageMixin, ShellMixin):
    """pywebview js_api 挂载点，组合所有功能模块。"""
