package com.loverspace.app;

import cn.jpush.android.service.JCommonService;

// JCore 2.0+ 要求：必须自定义一个 Service 继承 JCommonService，否则 JCore 的
// runActionWithService(action:init) 找不到 Service，初始化卡死 → 设备永不注册。
// 官方标准配置见极光 Android 集成指南「配置 Service」章节。
public class PushService extends JCommonService {
}
