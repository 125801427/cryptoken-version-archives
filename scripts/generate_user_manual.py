from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "cryptoken-user-manual.pdf"

FONT_HEI = Path("C:/Windows/Fonts/simhei.ttf")
FONT_SONG = Path("C:/Windows/Fonts/simsun.ttc")
pdfmetrics.registerFont(TTFont("CNHei", str(FONT_HEI)))
pdfmetrics.registerFont(TTFont("CNSong", str(FONT_SONG)))


def make_styles():
    styles = getSampleStyleSheet()
    base = ParagraphStyle(
        "ManualBase",
        parent=styles["Normal"],
        fontName="CNSong",
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor("#1f2937"),
        wordWrap="CJK",
        spaceAfter=5,
    )
    return {
        "base": base,
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base,
            fontName="CNHei",
            fontSize=30,
            leading=38,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base,
            fontName="CNHei",
            fontSize=14,
            leading=22,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#047857"),
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "Heading1CN",
            parent=base,
            fontName="CNHei",
            fontSize=19,
            leading=25,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "Heading2CN",
            parent=base,
            fontName="CNHei",
            fontSize=14,
            leading=20,
            textColor=colors.HexColor("#115e59"),
            spaceBefore=8,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "Heading3CN",
            parent=base,
            fontName="CNHei",
            fontSize=12,
            leading=17,
            textColor=colors.HexColor("#334155"),
            spaceBefore=5,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "small": ParagraphStyle(
            "SmallCN",
            parent=base,
            fontSize=9.2,
            leading=13,
            textColor=colors.HexColor("#475569"),
        ),
        "note": ParagraphStyle(
            "NoteCN",
            parent=base,
            fontName="CNHei",
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#065f46"),
            backColor=colors.HexColor("#ecfdf5"),
            borderColor=colors.HexColor("#a7f3d0"),
            borderWidth=0.6,
            borderPadding=8,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "warn": ParagraphStyle(
            "WarnCN",
            parent=base,
            fontName="CNHei",
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#7f1d1d"),
            backColor=colors.HexColor("#fff1f2"),
            borderColor=colors.HexColor("#fecdd3"),
            borderWidth=0.6,
            borderPadding=8,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "code": ParagraphStyle(
            "CodeCN",
            parent=base,
            fontName="CNSong",
            fontSize=8.3,
            leading=11,
            textColor=colors.HexColor("#111827"),
            backColor=colors.HexColor("#f8fafc"),
            borderColor=colors.HexColor("#e2e8f0"),
            borderWidth=0.5,
            borderPadding=6,
            leftIndent=0,
            spaceBefore=4,
            spaceAfter=8,
        ),
    }


S = make_styles()


def p(text: str, style: str = "base") -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), S[style])


def heading(text: str, level: int = 1) -> Paragraph:
    return p(text, f"h{level}")


def bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=2) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName="CNHei",
        bulletFontSize=8,
        bulletOffsetY=2,
        spaceAfter=7,
    )


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item), leftIndent=4) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName="CNHei",
        bulletFontSize=9,
        spaceAfter=7,
    )


def code(text: str) -> Preformatted:
    return Preformatted(text.strip("\n"), S["code"], maxLineLength=96)


def table(rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [[p(cell, "small") for cell in row] for row in rows]
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "CNHei"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    return t


def screenshot(path: str, title: str, max_width_mm: float = 170, max_height_mm: float = 210) -> list:
    file_path = ROOT / path
    if not file_path.exists():
        return [p(f"截图缺失: {path}", "warn")]
    img = Image(str(file_path))
    max_w = max_width_mm * mm
    max_h = max_height_mm * mm
    ratio = min(max_w / float(img.imageWidth), max_h / float(img.imageHeight))
    img.drawWidth = max_w
    img.drawHeight = float(img.imageHeight) * ratio
    return [
        Spacer(1, 4),
        img,
        p(title, "small"),
        Spacer(1, 7),
    ]


def cover(story: list):
    logo = ROOT / "public" / "cryptoken-logo.jpg"
    if logo.exists():
        img = Image(str(logo))
        img.drawWidth = 82 * mm
        img.drawHeight = img.imageHeight * (img.drawWidth / img.imageWidth)
        story.extend([Spacer(1, 18), img, Spacer(1, 18)])
    story.extend(
        [
            p("Cryptoken 币元平台", "cover_title"),
            p("多模型 Agent 自动采购与 x402 测试网支付使用手册", "cover_subtitle"),
            p("版本: v1.0<br/>生成日期: 2026-06-05<br/>适用环境: 本地/内网部署, 前端 127.0.0.1:4000, API 127.0.0.1:4010", "note"),
            Spacer(1, 20),
            p("本文档用于说明平台的功能结构、权限边界、采购篮逻辑、x402 支付链路、Agent 控制接口、测试网资金安全要求和日常运维方法。", "base"),
            p("重要边界: 平台不会索要助记词, 不会自动批准采购, 不会在主网扣款。当前支付链路使用 Arbitrum Sepolia 测试网 USDC, 真实链上转账必须由用户在钱包中人工确认。", "warn"),
        ]
    )
    story.append(PageBreak())


def build_manual():
    story: list = []
    cover(story)

    story.extend(
        [
            heading("1. 平台定位与核心目标"),
            p("Cryptoken 币元平台面向“Agent 能自动发现并组织多模型 token 采购需求, 但付款与最终入账仍由人确认”的场景。平台把自动化拆成三层: Agent 自动生成采购篮, 钱包人工支付, 管理/操作人员人工批准入库存。"),
            bullets(
                [
                    "采购对象: 平台内部的模型 token 库存账本, 本轮不接真实供应商下单接口。",
                    "安全边界: Agent 只能创建或取消采购篮, 不能绕过钱包确认、链上收款确认和人工批准。",
                    "支付边界: 使用 Arbitrum Sepolia 测试网 USDC, 不使用主网资金。",
                    "展示边界: 页面不列出币种价格行情, 只展示模型采购、钱包地址、支付状态和风控状态。",
                ]
            ),
            heading("2. 系统入口与账号", 1),
            table(
                [
                    ["项目", "内容"],
                    ["前端地址", "http://127.0.0.1:4000/"],
                    ["API 地址", "http://127.0.0.1:4010/"],
                    ["管理员账号", "admin / Cryptoken@2026"],
                    ["操作员账号", "operator / Operator@2026"],
                    ["测试网络", "arbitrum-sepolia"],
                    ["测试 USDC 合约", "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"],
                    ["付款地址", "当前连接的钱包地址"],
                    ["收款地址", "由 CRYPTOKEN_RECEIVER_ADDRESS 配置"],
                ],
                [42 * mm, 125 * mm],
            ),
            p("登录后页面顶部会显示当前用户及角色。登出后前端会清空本地状态并回到登录页。API 离线时页面会显示紧凑错误状态, 不允许进入假操作。", "note"),
        ]
    )

    story.extend(
        [
            heading("3. 角色权限"),
            table(
                [
                    ["能力", "管理员", "操作员"],
                    ["查看状态、市场、钱包、流水、帮助", "允许", "允许"],
                    ["生成多模型采购篮", "允许", "允许"],
                    ["调整采购篮行预算、移除行", "允许", "允许"],
                    ["生成 x402 payment-required、发起支付、刷新验证", "允许", "允许"],
                    ["批准/取消采购篮", "允许", "允许"],
                    ["Agent 控制开关", "允许", "不允许"],
                    ["钱包授权开关", "允许", "不允许"],
                    ["急停/恢复", "允许", "不允许"],
                ],
                [58 * mm, 42 * mm, 42 * mm],
            ),
            p("操作员点击无权限管理操作时, 后端返回 403, 前端显示明确错误状态。前端隐藏或禁用无权限按钮只是第一层保护, 权限最终由 API 校验。", "note"),
        ]
    )

    story.extend(
        [
            heading("4. 页面功能概览"),
            heading("4.1 总览", 2),
            p("总览页用于快速查看采购状态、预算使用、待处理数量、告警和近期流水。它不承担审批动作, 主要用于经营状态观察。"),
            heading("4.2 模型市场", 2),
            p("模型市场展示可采购模型的供应商、输入价格、输出价格、库存量与风险标记。用户可以从市场把多个模型加入采购篮。加入时平台会给新增行一个小额默认预算, 避免默认购物车超过单笔限额。"),
            heading("4.3 平台执行智能体", 2),
            p("这是核心操作页。用户可以输入 Agent 指令, 由平台根据每模型触发规则生成多模型采购篮。页面显示每一行的模型、供应商、价格、触发价、采购数量、行预算、费用、状态和移除按钮。"),
            heading("4.4 钱包", 2),
            p("钱包页展示收款地址、可用额度、单笔授权限额和授权开关。管理员可以启用或关闭钱包授权。关闭后, 未完成采购篮会被阻断。"),
            heading("4.5 风控", 2),
            p("风控页用于查看单笔限额、日预算、急停状态和风险事件。急停后自动付款关闭, 采购篮进入阻断状态, 需要管理员恢复。"),
            heading("4.6 流水", 2),
            p("流水页展示采购审批后写入库存账本的交易记录。一个多模型采购篮批准后, 每个模型行分别生成一条流水。"),
            heading("4.7 帮助", 2),
            p("帮助页集中放置解释性说明, 包括账号权限、付款安全、x402 支付层、Agent 接入、采购篮含义和审批原因。主流程页面尽量减少长解释文案。"),
        ]
    )

    story.extend(
        [
            heading("5. 多模型采购篮逻辑链"),
            p("当前系统已经从单个待确认计划升级为 purchaseCart。一个采购篮包含多个 items, 每个 item 对应一个模型、采购数量、单价、触发价、预算和状态。"),
            heading("5.1 自动触发价的定义", 2),
            p("自动触发价是每个模型允许 Agent 自动加入采购篮的最高单价。它面向“当模型价格低于阈值时, Agent 自动把该模型纳入补货/采购篮”的需求。"),
            bullets(
                [
                    "maxInputPriceUsdPerMTok: 该模型输入 token 的最高触发价。",
                    "maxOutputPriceUsdPerMTok: 该模型输出 token 的最高触发价。",
                    "maxBudgetUsd: 该模型行允许使用的预算上限。",
                    "targetQuantityMTok: 希望采购的输入 token 数量, 单位为百万 token。",
                    "全局 triggerPrice 只作为快捷生成规则的默认值, 不再是唯一阈值。",
                ]
            ),
            heading("5.2 Agent 生成采购篮", 2),
            numbered(
                [
                    "用户在“平台执行智能体”输入采购指令, 或外部 Agent 调用 purchase.cart.create。",
                    "后端解析模型、预算、触发价等条件。",
                    "系统逐个模型判断当前报价是否低于该模型触发价。",
                    "符合条件的模型行进入 purchaseCart.items。",
                    "系统计算采购篮 totalCostUsd, 检查钱包授权、单笔限额和日预算。",
                    "通过检查后状态为 Pending; 未通过则状态为 Blocked, 页面显示原因。",
                ]
            ),
            heading("5.3 购物车状态", 2),
            table(
                [
                    ["状态", "含义", "允许动作"],
                    ["Pending", "采购篮已生成, 未完成链上收款确认", "调整行预算、移除行、生成 402、支付、取消"],
                    ["WaitingApproval", "链上测试 USDC 收款已确认, 等待人工批准", "批准或取消"],
                    ["Approved", "人工批准完成, 各模型 token 已写入库存账本", "只读"],
                    ["Cancelled", "采购篮已取消", "只读"],
                    ["Blocked", "被钱包授权、单笔限额、日预算或急停阻断", "按原因处理后重新生成"],
                ],
                [31 * mm, 82 * mm, 55 * mm],
            ),
            heading("5.4 采购篮处理流程图", 2),
            code(
                """
用户/Agent 提交采购意图
        |
        v
解析模型、预算、每模型触发价
        |
        v
逐行判断: 当前报价 <= 该模型触发价?
        |
        +-- 否 --> 该模型不进入采购篮
        |
        +-- 是 --> 加入 purchaseCart.items
        |
        v
计算 totalCostUsd, 检查钱包授权、单笔限额、日预算、急停
        |
        +-- 不通过 --> purchaseCart.status = Blocked, 页面显示原因
        |
        +-- 通过 --> purchaseCart.status = Pending
        |
        v
等待用户生成 x402 付款要求并完成测试网 USDC 转账
"""
            ),
        ]
    )
    story.append(PageBreak())

    story.extend(
        [
            heading("6. x402 测试网支付链路"),
            p("x402 支付层按采购篮级别工作: 多个模型行只生成一笔合并 payment-required。链上确认后, 整个采购篮进入 WaitingApproval, 批准后才按行写入库存账本。"),
            heading("6.1 完整链路", 2),
            code(
                """
1. GET /api/x402/payment-required
   返回 cartId、orderId、合计金额、付款地址、收款地址、网络 arbitrum-sepolia。

2. 用户点击 Pay
   前端请求 MetaMask, 检查钱包账户是否等于配置的付款地址。

3. MetaMask 切换或添加 Arbitrum Sepolia
   chainId = 0x66eee, RPC = https://sepolia-rollup.arbitrum.io/rpc。

4. 用户在 MetaMask 中确认 USDC 转账
   to = 测试 USDC 合约, data = ERC20 transfer(收款地址, 合计金额)。

5. POST /api/x402/track-transfer
   前端提交 transactionHash 和 payerAddress。

6. 后端读取交易 receipt
   校验 USDC Transfer 日志: token 合约、付款地址、收款地址、金额都必须匹配。

7. 收款确认后状态变为 WaitingApproval
   采购篮仍不会自动入库, 需要人工点击 Approve。

8. Approve
   后端按采购篮每一行增加 tokenInventory, 同时生成交易流水。
"""
            ),
            heading("6.2 支付审批状态机", 2),
            code(
                """
Pending
  |  用户在钱包确认测试网 USDC 转账
  v
PendingConfirmation
  |  后端校验 receipt 中的 USDC Transfer 日志
  v
WaitingApproval
  |  人工点击 Approve
  v
Approved
  |  按采购篮每一行写入 tokenInventory 和交易流水
  v
Ledger Updated

任意未完成阶段:
  - Cancel -> Cancelled
  - 风控失败/急停/钱包未授权 -> Blocked
"""
            ),
            heading("6.3 资金安全规则", 2),
            bullets(
                [
                    "平台不会要求输入助记词。助记词只属于用户钱包, 不应交给任何网页或人员。",
                    "付款地址不匹配时, /api/x402/track-transfer 返回 403。",
                    "收款地址只使用 CRYPTOKEN_RECEIVER_ADDRESS 配置的地址。",
                    "未收到链上确认前, Approve 按钮保持禁用, 后端也会返回 403。",
                    "当前使用 Arbitrum Sepolia 测试网 USDC。不要把主网资金转入测试流程。",
                    "Circle Faucet 可用于领取测试 USDC, 地址: https://faucet.circle.com/。",
                ]
            ),
            heading("6.4 MetaMask 操作步骤", 2),
            numbered(
                [
                    "登录平台并生成采购篮, 确认总金额和收款地址。",
                    "点击 Generate 402, 复制 payment-required 内容备用。",
                    "点击 Pay。如果浏览器未检测到 MetaMask, 页面会打开 MetaMask 官网并复制付款摘要。",
                    "安装或打开 MetaMask 后, 切换到实际用于付款的钱包账户。",
                    "确认网络为 Arbitrum Sepolia。平台会尝试自动切换或添加该网络。",
                    "确认 USDC 转账金额、收款地址和网络后再点击钱包确认。",
                    "转账完成后, 平台记录交易 hash。点击 Verify 刷新链上收款状态。",
                    "状态变为 WaitingApproval 后, 点击 Approve 完成库存入账。",
                ]
            ),
        ]
    )

    story.append(PageBreak())

    story.extend(
        [
            heading("7. Agent 控制接口"),
            p("外部 Agent 通过 /api/agent/control 进入平台。Agent 控制开关关闭时, 该接口返回 403。管理员可以在页面上启用或关闭 Agent 控制。"),
            heading("7.1 主要动作", 2),
            table(
                [
                    ["action", "作用", "权限/边界"],
                    ["purchase.cart.create", "根据规则创建多模型采购篮", "管理员和操作员可提交; 必须通过触发价和预算检查"],
                    ["purchase.cart.cancel", "取消待处理采购篮", "管理员和操作员可提交"],
                    ["risk.emergency_stop", "触发急停", "仅管理员"],
                    ["wallet.authorization.request", "请求钱包授权", "仅管理员"],
                ],
                [48 * mm, 78 * mm, 42 * mm],
            ),
            heading("7.2 创建采购篮请求示例", 2),
            code(
                """
POST /api/agent/control
{
  "clientAgentId": "acme-support-agent",
  "action": "purchase.cart.create",
  "payload": {
    "items": [
      { "model": "DeepSeek V4 Pro", "maxBudgetUsd": 5, "maxInputPriceUsdPerMTok": 0.435 },
      { "model": "DeepSeek V4 Flash", "maxBudgetUsd": 3, "maxInputPriceUsdPerMTok": 0.14 }
    ],
    "callbackUrl": "https://client.example.com/cryptoken/callback"
  },
  "idempotencyKey": "cart-2026-06-05-001",
  "issuedAt": "2026-06-05T12:00:00.000Z"
}
"""
            ),
            p("接口契约文件: /agent-control.openapi.json。x402 支付契约文件: /x402-protocol.openapi.json。", "note"),
            heading("7.3 签名与幂等", 2),
            bullets(
                [
                    "支持 HMAC-SHA256 签名, 通过 X-Cryptoken-Signature 传入。",
                    "签名内容包含 requestId 或 idempotencyKey、clientAgentId、issuedAt、action 和 canonical payload。",
                    "同一个 idempotencyKey 重复提交相同请求会返回重放结果; 若内容不同则返回 409。",
                    "本地默认 secret 是 cryptoken-local-demo-secret。对外暴露前必须设置 CRYPTOKEN_AGENT_SECRET。",
                ]
            ),
        ]
    )

    story.extend(
        [
            heading("8. API 清单"),
            table(
                [
                    ["接口", "说明", "权限"],
                    ["POST /api/auth/login", "登录并设置 HttpOnly session cookie", "公开"],
                    ["GET /api/auth/me", "读取当前会话用户", "登录"],
                    ["POST /api/auth/logout", "清除会话", "登录"],
                    ["GET /api/state", "读取控制台状态、权限、采购篮、流水、钱包配置", "登录"],
                    ["POST /api/carts", "创建多模型采购篮", "管理员/操作员"],
                    ["POST /api/carts/:cartId/items/:itemId", "更新行预算或触发价", "管理员/操作员"],
                    ["POST /api/carts/:cartId/items/:itemId/remove", "移除采购行", "管理员/操作员"],
                    ["POST /api/carts/:cartId/approve", "链上确认后批准并写入库存", "管理员/操作员"],
                    ["POST /api/carts/:cartId/cancel", "取消采购篮", "管理员/操作员"],
                    ["GET /api/x402/payment-required", "返回采购篮级 x402 支付要求", "登录"],
                    ["POST /api/x402/track-transfer", "记录交易 hash 并校验链上 USDC Transfer", "登录"],
                    ["POST /api/x402/settle", "记录钱包或客户端提交的 x402 settlement", "登录"],
                    ["POST /api/x402/payment-webhook", "接收收款监听回调", "登录"],
                    ["POST /api/agent/control", "外部 Agent 控制入口", "登录且 Agent 控制开启"],
                    ["POST /api/risk/emergency-stop", "急停", "管理员"],
                    ["POST /api/risk/resume", "恢复急停", "管理员"],
                    ["POST /api/settings/agent-control", "开启/关闭 Agent 控制", "管理员"],
                    ["POST /api/wallet/authorization", "开启/关闭钱包授权", "管理员"],
                ],
                [58 * mm, 82 * mm, 28 * mm],
            ),
        ]
    )
    story.append(PageBreak())

    story.extend(
        [
            heading("9. 典型操作流程"),
            heading("9.1 管理员完整采购流程", 2),
            numbered(
                [
                    "打开 http://127.0.0.1:4000/。",
                    "使用 admin / Cryptoken@2026 登录。",
                    "确认钱包授权已开启, 急停未开启, 单笔限额和日预算足够。",
                    "进入平台执行智能体, 输入采购指令, 点击 Generate cart。",
                    "检查采购篮行: 模型名称、触发价、行预算、数量、合计金额。",
                    "必要时调整 Row budget 或 Remove 某个模型行。",
                    "点击 Generate 402 生成付款要求。",
                    "点击 Pay, 在 MetaMask 中确认 Arbitrum Sepolia 测试 USDC 转账。",
                    "交易提交后点击 Verify 刷新收款状态。",
                    "状态变为 WaitingApproval 后点击 Approve。",
                    "进入流水或总览页查看各模型入账记录。",
                ]
            ),
            heading("9.2 操作员流程", 2),
            p("操作员可以生成、调整、取消、支付和批准采购篮, 但不能修改 Agent 控制开关、钱包授权和急停状态。若发现这些控制项不可点击, 这是角色权限限制。"),
            heading("9.3 外部 Agent 流程", 2),
            numbered(
                [
                    "Agent 先调用 POST /api/auth/login 获取会话。",
                    "调用 GET /api/state 读取当前预算、触发价、钱包授权和市场模型。",
                    "调用 POST /api/agent/control, action = purchase.cart.create。",
                    "平台生成 Pending 或 Blocked 采购篮。",
                    "客户或平台人员在前端完成 x402 支付和人工批准。",
                    "Agent 可通过回调或状态接口获知审批结果。",
                ]
            ),
        ]
    )

    story.append(PageBreak())

    story.extend(
        [
            heading("10. 风控与异常处理"),
            table(
                [
                    ["问题", "表现", "处理方式"],
                    ["购物车 Blocked", "付款按钮禁用, 状态显示 Blocked", "查看 rule: 可能是单笔限额、日预算、钱包未授权或急停。调整后重新生成。"],
                    ["Approve 禁用", "按钮置灰", "需要先完成链上收款确认, 状态必须为 WaitingApproval。"],
                    ["付款地址错误", "track-transfer 返回 403", "切换 MetaMask 到配置的付款地址。"],
                    ["没有交易 hash", "Verify 提示没有已提交链上交易", "先点击 Pay 并在 MetaMask 中完成转账。"],
                    ["API 离线", "登录或状态加载失败", "启动 npm run api 或 npm run dev:all, 检查 4010 端口。"],
                    ["前端打不开", "4000 端口无响应", "启动 npm run dev 或 npm run dev:all, 检查端口占用。"],
                    ["测试 USDC 不足", "MetaMask 转账失败", "到 Circle Faucet 领取 Arbitrum Sepolia USDC。"],
                ],
                [40 * mm, 55 * mm, 73 * mm],
            ),
            heading("11. 启动与部署"),
            p("开发环境推荐使用 dev:all 同时启动前端和 API。当前 Windows 环境已经修复启动脚本, 能在后台运行而不占用 Codex 会话终端。"),
            code(
                """
# 安装依赖
npm install

# 只启动 API
npm run api

# 只启动前端
npm run dev -- --webpack --hostname 127.0.0.1 --port 4000

# 同时启动前端和 API
npm run dev:all

# 生产构建
npm run build

# 生产静态服务 + API
npm run start:all
"""
            ),
            heading("11.1 可配置环境变量", 2),
            table(
                [
                    ["变量", "用途", "默认值"],
                    ["CRYPTOKEN_AGENT_SECRET", "Agent HMAC 签名 secret", "cryptoken-local-demo-secret"],
                    ["CRYPTOKEN_ARBITRUM_RPC_URL", "链上 receipt 查询 RPC", "https://sepolia-rollup.arbitrum.io/rpc"],
                    ["CRYPTOKEN_USDC_ADDRESS", "测试 USDC 合约", "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"],
                    ["CRYPTOKEN_SETTLEMENT_NETWORK", "x402 返回网络名", "arbitrum-sepolia"],
                    ["CRYPTOKEN_PAYER_ADDRESS", "允许付款地址", "可选; 默认使用当前连接钱包"],
                    ["CRYPTOKEN_RECEIVER_ADDRESS", "平台收款地址", "必须配置为实际收款钱包"],
                ],
                [55 * mm, 55 * mm, 58 * mm],
            ),
        ]
    )

    story.extend(
        [
            heading("12. 测试检查表"),
            bullets(
                [
                    "错误账号登录返回 401。",
                    "admin 登录后可以操作 Agent 控制、钱包授权、急停、采购篮审批。",
                    "operator 登录后不能操作 Agent 控制、钱包授权、急停。",
                    "未登录访问 /api/state 返回 401。",
                    "Agent 创建采购篮时, 只包含低于各自触发价的模型。",
                    "一个采购篮可以包含两个以上不同模型。",
                    "x402 返回合计金额、cartId、arbitrum-sepolia、正确付款/收款地址。",
                    "错误付款地址调用 track-transfer 返回 403。",
                    "未链上确认时不能批准采购篮。",
                    "批准后每个模型库存分别增加, 流水按行记录。",
                    "浏览器无控制台错误、无小于 16px 文本、无小于 44px 点击目标、无横向溢出。",
                    "npm run lint 和 npm run build 均通过。",
                ]
            ),
            heading("13. 当前实现边界"),
            p("本轮实现已经跑通多模型采购篮、x402 测试网支付接口、链上收款校验、人工批准和库存账本入账。仍需注意:"),
            bullets(
                [
                    "本轮不连接真实供应商采购接口, 批准后写入的是平台内部库存账本。",
                    "真实生产认证不应使用固定账号, 应迁移到企业身份系统或 OAuth/OIDC。",
                    "本地 JSON 状态适合内网演示和小规模验证, 生产应迁移到数据库。",
                    "Agent HMAC 默认 secret 必须在对外部署前替换。",
                    "主网支付上线前必须重新审计钱包地址、额度、签名、回调来源和链上监听。",
                ]
            ),
            p("手册结束。", "note"),
        ]
    )

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=15 * mm,
        title="Cryptoken 币元平台使用手册",
        author="Codex",
    )

    def page_canvas(canvas, document):
        canvas.saveState()
        canvas.setFont("CNSong", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(16 * mm, 9 * mm, "Cryptoken 币元平台使用手册")
        canvas.drawRightString(194 * mm, 9 * mm, f"第 {document.page} 页")
        canvas.restoreState()

    doc.build(story, onFirstPage=page_canvas, onLaterPages=page_canvas)
    return PDF_PATH


if __name__ == "__main__":
    print(build_manual())
