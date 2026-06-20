/* ============================================
   ekobirey - Shared Animated Background (Stars + Grass Canvas)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Stars
    const starsContainer = document.getElementById('stars-container');
    if (starsContainer) {
        for (let i = 0; i < 30; i++) {
            let star = document.createElement('div');
            star.className = 'star';
            star.style.width = Math.random() * 3 + 1 + 'px';
            star.style.height = star.style.width;
            star.style.left = Math.random() * 100 + 'vw';
            star.style.top = Math.random() * 100 + 'vh';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }

    // 2. Grass Canvas Animation
    const grassCanvas = document.getElementById('grass-canvas');
    if (grassCanvas) {
        const grassCtx = grassCanvas.getContext('2d');
        let gWidth, gHeight;
        let blades = [];

        function resizeGrassCanvas() {
            gWidth = window.innerWidth;
            gHeight = window.innerHeight;
            grassCanvas.width = gWidth;
            grassCanvas.height = gHeight;
            initGrassBlades();
        }
        window.addEventListener('resize', resizeGrassCanvas);

        class GrassBlade {
            constructor(x) {
                this.x = x;
                this.y = gHeight;
                this.layer = Math.random();
                this.height = (Math.random() * 100 + 50) * (this.layer * 0.5 + 0.5);
                this.height = Math.min(this.height, gHeight * 0.4);
                this.width = Math.random() * 3 + 2;
                this.swayPhase = Math.random() * Math.PI * 2;
                this.swaySpeed = Math.random() * 0.001 + 0.0005;
                const hue = 110 + Math.random() * 30;
                const sat = 40 + Math.random() * 20;
                const lig = 30 + (this.layer * 20);
                this.colorBottom = `hsl(${hue}, ${sat}%, 20%)`;
                this.colorTop = `hsl(${hue}, ${sat}%, ${lig}%)`;
            }
            draw(time) {
                const sway = Math.sin(time * this.swaySpeed + this.swayPhase);
                const swayAmount = sway * (this.height * 0.3);
                grassCtx.beginPath();
                grassCtx.moveTo(this.x, this.y);
                grassCtx.quadraticCurveTo(
                    this.x + swayAmount / 2, this.y - this.height / 2,
                    this.x + swayAmount, this.y - this.height
                );
                grassCtx.quadraticCurveTo(
                    this.x + swayAmount / 2 + this.width, this.y - this.height / 2,
                    this.x + this.width, this.y
                );
                grassCtx.closePath();
                const gradient = grassCtx.createLinearGradient(this.x, this.y, this.x + swayAmount, this.y - this.height);
                gradient.addColorStop(0, this.colorBottom);
                gradient.addColorStop(1, this.colorTop);
                grassCtx.fillStyle = gradient;
                grassCtx.fill();
            }
        }

        function initGrassBlades() {
            blades = [];
            const bladeCount = Math.floor(gWidth / 2);
            for (let i = 0; i < bladeCount; i++) {
                blades.push(new GrassBlade(Math.random() * gWidth));
            }
            blades.sort((a, b) => a.layer - b.layer);
        }

        function animateGrass(time) {
            grassCtx.clearRect(0, 0, gWidth, gHeight);
            for (let i = 0; i < blades.length; i++) {
                blades[i].draw(time);
            }
            requestAnimationFrame(animateGrass);
        }

        resizeGrassCanvas();
        requestAnimationFrame(animateGrass);
    }
});
