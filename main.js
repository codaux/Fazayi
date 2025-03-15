// تنظیمات اولیه
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x001a2e); // رنگ پس‌زمینه تیره

// کاهش پرسپکتیو با افزایش فاصله کانونی
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// اضافه کردن کنترل‌های چرخش
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 70; // افزایش فاصله حداقل
controls.maxDistance = 100; // افزایش فاصله حداکثر
controls.maxPolarAngle = Math.PI;

// تنظیمات نور
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // کاهش شدت نور محیطی
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3); // کاهش شدت نور جهت‌دار
directionalLight.position.set(-4, 3, 3); // تغییر جهت نور
directionalLight.castShadow = true;
directionalLight.shadow.radius = 6; // افزایش نرمی سایه
directionalLight.shadow.bias = -0.0001; // تنظیم بایاس سایه
directionalLight.shadow.mapSize.width = 1024; // افزایش کیفیت سایه
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

// اضافه کردن نور نقطه‌ای برای جلوه بیشتر
const pointLight = new THREE.PointLight(0xffffff, 0.6, 100); // کاهش شدت نور نقطه‌ای
pointLight.position.set(-3, 3, 3);
scene.add(pointLight);

// اضافه کردن نور نرم از پایین
const bottomLight = new THREE.PointLight(0xff00ff, 0.2, 100);
bottomLight.position.set(1, -3, 1);
scene.add(bottomLight);

// ایجاد محفظه نیم‌کره شفاف با کیفیت بالاتر
const radius = 7;
const containerGeometry = new THREE.SphereGeometry(radius, 128, 128, 0, Math.PI * 2, 0, Math.PI / 2, false);
const containerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xddffff,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    envMapIntensity: 1.0
});
const container = new THREE.Mesh(containerGeometry, containerMaterial);
container.castShadow = false;
container.receiveShadow = true;
scene.add(container);

// اضافه کردن مدل KAF به عنوان کف
const loader = new THREE.GLTFLoader();
let base; // تعریف متغیر base در سطح بالاتر برای دسترسی در کل کد

loader.load(
    'KAF.gltf',
    function (gltf) {
        base = gltf.scene;
        base.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshPhysicalMaterial({
                    color: 0xff8000,
                    metalness: 0.2,
                    roughness: 0.9,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.3,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1
                });
                node.castShadow = false;
                node.receiveShadow = true;
            }
        });
        
        base.position.set(0, -1, 0);
        base.scale.set(35, 35, 35);
        
        scene.add(base);

        // اضافه کردن کد برای نمایش اندازه مدل در کنسول
        const box = new THREE.Box3().setFromObject(base);
        const size = box.getSize(new THREE.Vector3());
        console.log('Model size:', size);
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('Error loading KAF model:', error);
    }
);

// تنظیمات فیزیک توپ‌ها
const BALL_RADIUS = 0.8; // افزایش از 0.64 به 0.8
const BALL_MASS = 2.0;
const FRICTION = 0.88; // کاهش اصطکاک
const RESTITUTION = 0.45; // افزایش ضریب بازگشت
const REPULSION_FORCE = 2.0; // افزایش نیروی دافعه

// تنظیم موقعیت اولیه توپ‌ها
const ballColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
const balls = [];
const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 64); // افزایش کیفیت توپ‌ها

const startHeight = 4;
const spacing = BALL_RADIUS * 3;

ballColors.forEach((color, index) => {
    const ballMaterial = new THREE.MeshPhysicalMaterial({ 
        color,
        metalness: 0.1,
        roughness: 0.1,
        clearcoat: 0.9,
        clearcoatRoughness: 0.0
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    
    const angle = (index / ballColors.length) * Math.PI * 2;
    const radius = spacing;
    
    ball.position.set(
        Math.cos(angle) * radius,
        startHeight,
        Math.sin(angle) * radius
    );
    
    ball.userData.velocity = new THREE.Vector3(0, 0, 0);
    ball.userData.mass = BALL_MASS;
    ball.userData.initialPosition = ball.position.clone();
    scene.add(ball);
    balls.push(ball);
});

// تغییر موقعیت دوربین برای نمای بهتر
camera.position.set(25, 20, 25); // افزایش فاصله دوربین
camera.lookAt(0, 0, 0);

// متغیرهای انیمیشن
let isAnimating = false;
let animationStartTime = 0;
const gravity = -0.095;
let gravityEnabled = false; // متغیر جدید برای کنترل جاذبه

// تابع ریست کردن موقعیت توپ‌ها
function resetBalls() {
    isAnimating = false;
    gravityEnabled = false; // غیرفعال کردن جاذبه
    balls.forEach(ball => {
        ball.position.copy(ball.userData.initialPosition);
        ball.userData.velocity.set(0, 0, 0);
    });
}

// اضافه کردن event listener برای دکمه ریست
document.getElementById('resetButton').addEventListener('click', resetBalls);

// اضافه کردن event listener برای کلیک و تپ
const handleThrowBalls = () => {
    isAnimating = true;
    gravityEnabled = true;
    balls.forEach(ball => {
        ball.userData.velocity.set(
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 0.8
        );
    });
};

renderer.domElement.addEventListener('click', handleThrowBalls);
renderer.domElement.addEventListener('touchstart', handleThrowBalls);

// اضافه کردن شتاب‌سنج
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        if (isAnimating) {
            const acceleration = event.accelerationIncludingGravity;
            const shakeThreshold = 15; // مقدار آستانه برای تشخیص تکان
            if (Math.abs(acceleration.x) > shakeThreshold || Math.abs(acceleration.y) > shakeThreshold || Math.abs(acceleration.z) > shakeThreshold) {
                balls.forEach(ball => {
                    ball.userData.velocity.x += (Math.random() - 0.5) * 0.1; // تکان دادن توپ‌ها
                    ball.userData.velocity.y += (Math.random() - 0.5) * 0.1;
                    ball.userData.velocity.z += (Math.random() - 0.5) * 0.1;
                });
            }
        }
    });
}

// به‌روزرسانی تابع animate برای در نظر گرفتن میرایی بیشتر
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (isAnimating && base) {
        balls.forEach(ball => {
            if (gravityEnabled) {
                ball.userData.velocity.y += gravity;
            }
            
            // اعمال اصطکاک بیشتر برای میرایی حرکت
            ball.userData.velocity.multiplyScalar(FRICTION);
            
            // اضافه کردن یک حد آستانه برای توقف حرکت‌های کوچک
            if (ball.userData.velocity.length() < 0.01) {
                ball.userData.velocity.set(0, 0, 0);
            }
            
            ball.position.add(ball.userData.velocity);
            
            // بررسی برخورد با مدل KAF
            const raycaster = new THREE.Raycaster(
                ball.position.clone().add(new THREE.Vector3(0, 1, 0)),
                new THREE.Vector3(0, -1, 0)
            );
            const intersects = raycaster.intersectObject(base, true);
            
            if (intersects.length > 0 && intersects[0].distance < 1 + BALL_RADIUS) {
                ball.position.y = intersects[0].point.y + BALL_RADIUS;
                
                // محاسبه نرمال سطح در نقطه برخورد
                const surfaceNormal = intersects[0].face.normal.clone();
                surfaceNormal.applyQuaternion(intersects[0].object.quaternion);
                
                // بازتاب سرعت نسبت به نرمال سطح
                const reflection = ball.userData.velocity.reflect(surfaceNormal);
                ball.userData.velocity.copy(reflection.multiplyScalar(RESTITUTION));
            }
            
            // بررسی برخورد با نیم‌کره
            const distanceFromCenter = new THREE.Vector3(
                ball.position.x,
                ball.position.y,
                ball.position.z
            ).length();
            
            if (distanceFromCenter > radius - BALL_RADIUS) {
                const normal = ball.position.clone().normalize();
                const reflection = ball.userData.velocity.reflect(normal);
                ball.userData.velocity.copy(reflection.multiplyScalar(RESTITUTION));
                const newPos = normal.multiplyScalar(radius - BALL_RADIUS);
                ball.position.copy(newPos);
            }
        });

        // بررسی برخورد بین توپ‌ها
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                handleBallCollision(balls[i], balls[j]);
            }
        }

        // بررسی خروج از سوراخ‌ها
        balls.forEach(ball => {
            // حذف سوراخ‌های روی شیشه
            // const distance = ball.position.distanceTo(hole.position);
            // if (distance < 1) {
            //     ball.position.set(
            //         (Math.random() - 0.5) * 4,
            //         Math.abs((Math.random()) * 2),
            //         (Math.random() - 0.5) * 4
            //     );
            //     ball.userData.velocity.set(0, 0, 0);
            // }
        });
    }

    renderer.render(scene, camera);
}

// به‌روزرسانی تابع برخورد توپ‌ها با افزایش نیروی دافعه
function handleBallCollision(ball1, ball2) {
    const dx = ball2.position.x - ball1.position.x;
    const dy = ball2.position.y - ball1.position.y;
    const dz = ball2.position.z - ball1.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < BALL_RADIUS * 2) {
        // محاسبه بردار نرمال برخورد
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;

        // تصحیح موقعیت‌ها برای جلوگیری از تداخل
        const correction = (BALL_RADIUS * 2 - distance) / 2;
        ball1.position.x -= nx * correction;
        ball1.position.y -= ny * correction;
        ball1.position.z -= nz * correction;
        ball2.position.x += nx * correction;
        ball2.position.y += ny * correction;
        ball2.position.z += nz * correction;

        // محاسبه سرعت نسبی
        const vx = ball2.userData.velocity.x - ball1.userData.velocity.x;
        const vy = ball2.userData.velocity.y - ball1.userData.velocity.y;
        const vz = ball2.userData.velocity.z - ball1.userData.velocity.z;

        // محاسبه ضربه با نیروی دافعه بیشتر
        const impulse = 2 * (nx * vx + ny * vy + nz * vz) / 
                       (1 / ball1.userData.mass + 1 / ball2.userData.mass) * REPULSION_FORCE;

        // اعمال تغییرات سرعت
        ball1.userData.velocity.x += (impulse * nx) / ball1.userData.mass * RESTITUTION;
        ball1.userData.velocity.y += (impulse * ny) / ball1.userData.mass * RESTITUTION;
        ball1.userData.velocity.z += (impulse * nz) / ball1.userData.mass * RESTITUTION;
        ball2.userData.velocity.x -= (impulse * nx) / ball2.userData.mass * RESTITUTION;
        ball2.userData.velocity.y -= (impulse * ny) / ball2.userData.mass * RESTITUTION;
        ball2.userData.velocity.z -= (impulse * nz) / ball2.userData.mass * RESTITUTION;

        // اضافه کردن حد آستانه برای سرعت‌های کوچک
        if (impulse < 0.01) {
            ball1.userData.velocity.multiplyScalar(0.8);
            ball2.userData.velocity.multiplyScalar(0.8);
        }

        // اضافه کردن کمی نیروی تصادفی برای بازیگوشی بیشتر
        const randomForce = 0.05;
        ball1.userData.velocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * randomForce,
            (Math.random() - 0.5) * randomForce,
            (Math.random() - 0.5) * randomForce
        ));
        ball2.userData.velocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * randomForce,
            (Math.random() - 0.5) * randomForce,
            (Math.random() - 0.5) * randomForce
        ));
    }
}

// تنظیم اندازه پنجره
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// شروع انیمیشن
animate();
