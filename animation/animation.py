from manim import *

# ==========================================
# 全局配置 (高级视觉核心)
# ==========================================
config.background_color = "#050508" # 深海军蓝背景，增加深度
config.pixel_height = 1080
config.pixel_width = 1920
config.frame_rate = 60

class AntiFraudArch(Scene):
    def construct(self):
        # --- 1. 颜色定义 (霓虹科技感) ---
        C_CYAN = "#00E5FF"      # 输入/感知
        C_PURPLE = "#9D4EDD"    # 大脑核心
        C_NEON_GREEN = "#00FF41" # RAG 检索
        C_NEON_RED = "#FF0055"   # 输出拦截
        C_WHITE = "#FFFFFF"

        # --- 2. 完善的背景网格 (点阵样式，更高级) ---
        # 不要用实线，用淡淡的点阵
        grid_dots = VGroup()
        for x in range(-7, 8):
            for y in range(-4, 5):
                dot = Dot(point=UR*x + RIGHT*y, radius=0.01, color=BLUE_E, fill_opacity=0.2)
                grid_dots.add(dot)
        self.add(grid_dots)

        # ==========================================
        # 3. 核心组件定义 (加入发光 Glow 效果)
        # ==========================================

        # A. [感知层]
        phone = self.get_tech_icon("PHONE", C_CYAN).shift(LEFT*5 + UP*1.2)
        sms = self.get_tech_icon("SMS", C_CYAN).shift(LEFT*5 + DOWN*1.2)
        perception_label = Text("多模态感知 (Perception)", font_size=20, color=C_CYAN).next_to(phone, UP, buff=0.6)

        # B. [大脑核心] (核心 Glow 区域)
        brain_ring = Annulus(inner_radius=1.3, outer_radius=1.38, color=C_PURPLE, fill_opacity=0.8)
        # 添加发光底色 (一层半透明的圆，颜色偏深)
        brain_glow = Circle(radius=1.6, color=C_PURPLE, fill_opacity=0.15, stroke_width=0)
        brain_center = Circle(radius=1.1, color=C_PURPLE, fill_opacity=0.05, stroke_width=1)
        brain_text = Text("Anti-Fraud Agent\nLLM推理引擎", font_size=24, color=C_WHITE).move_to(brain_center)
        # 核心 VGroup，包含 Glow
        agent_brain = VGroup(brain_glow, brain_ring, brain_center, brain_text).shift(RIGHT*0.5)

        # C. [RAG 知识库] (绿色 Glow)
        rag_cloud = self.get_vector_cloud(C_NEON_GREEN).shift(UP*3.2 + RIGHT*0.5)
        # RAG 发光底色
        rag_glow = Ellipse(width=3, height=1.5, color=C_NEON_GREEN, fill_opacity=0.1, stroke_width=0).move_to(rag_cloud)
        rag_label = Text("RAG 动态知识库", font_size=18, color=C_NEON_GREEN).next_to(rag_cloud, UP, buff=0.3)
        rag_module = VGroup(rag_glow, rag_cloud, rag_label)

        # D. [执行输出] (红色 Glow)
        out_rect = RoundedRectangle(height=1.3, width=3, color=C_NEON_RED, fill_opacity=0.2, stroke_width=2)
        # 输出框发光底色
        out_glow = RoundedRectangle(height=1.6, width=3.3, color=C_NEON_RED, fill_opacity=0.1, stroke_width=0, corner_radius=0.2).move_to(out_rect)
        out_text = Text("主动拦截指令", font_size=22, color=C_NEON_RED)
        output_box = VGroup(out_glow, out_rect, out_text).to_edge(RIGHT, buff=0.8)


        # ==========================================
        # 4. 完善的动画执行流 (节奏优化)
        # ==========================================

        # Step 1: 感知层入场 (带有淡淡的呼吸感)
        self.play(FadeIn(perception_label), Create(phone), Create(sms), run_time=1.2)
        self.add_background_breathing(phone, C_CYAN) # 添加后台呼吸
        self.add_background_breathing(sms, C_CYAN)
        self.wait(0.3)

        # Step 2: 数据汇聚 (粒子流动，速度快，体现即时性)
        line_p = Line(phone.get_right(), agent_brain.get_left(), color=C_CYAN, stroke_width=2, stroke_opacity=0.5)
        line_s = Line(sms.get_right(), agent_brain.get_left(), color=C_CYAN, stroke_width=2, stroke_opacity=0.5)
        self.play(Create(line_p), Create(line_s), run_time=0.5)

        p1 = Dot(radius=0.08, color=C_CYAN, fill_opacity=0.8)
        p2 = Dot(radius=0.08, color=C_CYAN, fill_opacity=0.8)
        self.play(
            MoveAlongPath(p1, line_p),
            MoveAlongPath(p2, line_s),
            rate_func=exponential_decay, # 吸入感
            run_time=1
        )
        self.remove(p1, p2)

        # Step 3: 大脑激活 (圆环旋转 & Glow 亮起)
        # 此时只显示 Glow 和环，文字稍后出
        brain_core = VGroup(brain_glow, brain_ring, brain_center)
        self.play(FadeIn(brain_core), run_time=0.8)
        self.play(Indicate(brain_ring, color=C_WHITE, scale_factor=1.1), run_time=0.5)
        self.play(Write(brain_text), run_time=0.8)
        
        # [关键高级点]：让大脑 Glow 产生持续的霓虹呼吸效果
        self.add_neon_breathing(brain_glow, C_PURPLE, 0.1, 0.25)
        # 让大脑圆环持续缓慢旋转
        brain_ring.add_updater(lambda m, dt: m.rotate(dt * 0.4))

        # Step 4: RAG 检索 (绿色闪烁)
        self.play(FadeIn(rag_module), run_time=1)
        rag_line = DashedLine(agent_brain.get_top(), rag_cloud.get_bottom(), color=C_NEON_GREEN, stroke_opacity=0.6)
        self.play(Create(rag_line))
        
        # 优化检索动画：知识点像神经元一样跳动
        self.play(
            LaggedStart(*[Flash(pt, color=C_WHITE, flash_radius=0.2) for pt in rag_cloud[0]], lag_ratio=0.03),
            Indicate(rag_glow, color=C_NEON_GREEN, scale_factor=1.2), # 绿色 Glow 闪一下
            run_time=2
        )
        self.play(Flash(agent_brain, color=C_NEON_GREEN, flash_radius=1.8))

        # Step 5: 思维链 (CoT) 步进 (加一个边框，显得更严谨)
        cot_box = SurroundingRectangle(Text("111", font_size=16).shift(DOWN*2.5 + RIGHT*0.5), color=C_PURPLE, buff=0.1, stroke_opacity=0.3)
        cot_title = Text("Chain of Thought (CoT)", font_size=14, color=C_PURPLE).next_to(cot_box, UP, buff=0.1)
        self.play(Create(cot_box), Write(cot_title))

        steps = ["特征嵌入与特征对齐...", "多模态特征融合...", "风险概率建模...", "策略优化生成..."]
        step_group = VGroup()
        for i, s in enumerate(steps):
            txt = Text(s, font_size=15, color=C_WHITE).shift(DOWN*(2.3+i*0.3) + RIGHT*0.5)
            self.play(Write(txt), run_time=0.4)
            step_group.add(txt)

        # Step 6: 输出决策 (红色拦截)
        out_arrow = Arrow(agent_brain.get_right(), output_box.get_left(), color=C_NEON_RED)
        self.play(GrowArrow(out_arrow))
        # 整个 Output VGroup 飞入并显示 Glow
        self.play(DrawBorderThenFill(output_box), run_time=1)
        self.play(Indicate(out_rect, color=C_WHITE, scale_factor=1.05), run_time=0.5)
        self.add_neon_breathing(out_glow, C_NEON_RED, 0.05, 0.2) # 红色 Glow 后台呼吸

        self.wait(3)

    # ==========================================
    # 5. 工具函数 (图形与动画)
    # ==========================================

    # --- 后台霓虹呼吸效果器 ---
    def add_neon_breathing(self, mobject, color, min_opacity, max_opacity):
        def update_opacity(m, dt):
            # 使用正弦波控制透明度
            import math
            time = self.time
            new_opacity = min_opacity + (max_opacity - min_opacity) * (math.sin(time * 3) + 1) / 2
            m.set_fill(color=color, opacity=new_opacity)
        mobject.add_updater(update_opacity)

    # --- 淡淡的背景呼吸效果器 (用于非 Glow 物体) ---
    def add_background_breathing(self, mobject, color):
        def update_stroke(m, dt):
            import math
            time = self.time
            new_opacity = 0.3 + 0.3 * (math.sin(time * 2) + 1) / 2
            m.set_stroke(color=color, opacity=new_opacity)
        mobject.add_updater(update_stroke)

    # --- 绘制科技感图标 ---
    def get_tech_icon(self, type, color):
        if type == "PHONE":
            # 霓虹风格手机
            body = RoundedRectangle(height=0.9, width=0.55, color=color, stroke_width=2, corner_radius=0.1)
            speaker = Line(LEFT*0.1, RIGHT*0.1, color=color, stroke_width=2).move_to(body.get_top()+DOWN*0.1)
            btn = Circle(radius=0.06, color=color, stroke_width=2).move_to(body.get_bottom()+UP*0.1)
            return VGroup(body, speaker, btn)
        else:
            # 霓虹风格短信
            body = Rectangle(height=0.7, width=0.9, color=color, stroke_width=2)
            lines = VGroup(*[Line(LEFT*0.25, RIGHT*0.25, color=color, stroke_width=1.5) for _ in range(2)]).arrange(DOWN, buff=0.15).move_to(body)
            triangle = Triangle(color=color, stroke_width=2).scale(0.15).rotate(PI).move_to(body.get_bottom()+DOWN*0.05)
            return VGroup(body, lines, triangle)

    # --- 绘制向量云 (增加了透明度随机) ---
    def get_vector_cloud(self, color):
        import random
        # 设定一个固定的种子，确保每次渲染数据点位置一致
        random.seed(42)
        cloud = VGroup()
        for _ in range(30):
            dot = Dot(
                radius=0.05, 
                color=color, 
                fill_opacity=random.uniform(0.4, 0.9) # 不同透明度增加层次感
            ).shift(RIGHT*random.uniform(-1.2, 1.2) + UP*random.uniform(-0.7, 0.7))
            cloud.add(dot)
        return VGroup(cloud)