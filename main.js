// تنظیمات اولیه
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0x001a2e); // رنگ پس‌زمینه تیره

// تنظیمات فیزیک توپ‌ها
const BALL_RADIUS = 0.85;
const BALL_MASS = 1.0;
const FRICTION = 0.7;
const RESTITUTION = 0.2;
const REPULSION_FORCE = 0.8;
const INITIAL_VELOCITY = 0.2;
const AIR_RESISTANCE = 0.98;
const MAX_VELOCITY = 0.8;
const VELOCITY_THRESHOLD = 0.02;
const DAMPING_FACTOR = 0.5;
const BASE_GRAVITY = 0.015; // جاذبه پایه
const TILT_FACTOR = 0.02; // ضریب تأثیر کج شدن

// متغیرهای کنترلی
let isSceneReady = false;
let isAnimating = false;
let gravityEnabled = false;
let base = null;
const balls = [];
const ballColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);

// کاهش پرسپکتیو با افزایش فاصله کانونی
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(25, 20, 25);
camera.lookAt(0, 0, 0);

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
controls.minDistance = 70;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI;

// تنظیمات نور
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
directionalLight.position.set(-4, 3, 3);
directionalLight.castShadow = true;
directionalLight.shadow.radius = 6;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 0.6, 100);
pointLight.position.set(-3, 3, 3);
scene.add(pointLight);

const bottomLight = new THREE.PointLight(0xff00ff, 0.2, 100);
bottomLight.position.set(1, -3, 1);
scene.add(bottomLight);

// ایجاد محفظه نیم‌کره شفاف
const radius = 7;
const containerGeometry = new THREE.SphereGeometry(radius, 128, 128, 0, Math.PI * 2, 0, Math.PI / 2);
const containerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xddffff,
    transparent: true,
    opacity: 0.3,
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

// تابع مقداردهی اولیه توپ‌ها
function initializeBalls() {
    balls.forEach(ball => scene.remove(ball));
    balls.length = 0;

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
        ball.userData.angularVelocity = new THREE.Vector3(0, 0, 0);
        ball.userData.mass = BALL_MASS;
        ball.userData.energy = 0;
        ball.userData.initialPosition = ball.position.clone();
        scene.add(ball);
        balls.push(ball);
    });
}

// تابع پرت کردن توپ‌ها
function launchBalls() {
    if (!isSceneReady) return;
    
    isAnimating = true;
    gravityEnabled = true;
    balls.forEach(ball => {
        const randomAngle = Math.random() * Math.PI * 2;
        const randomSpeed = INITIAL_VELOCITY * (0.5 + Math.random() * 0.3);
        
        ball.userData.velocity.set(
            Math.cos(randomAngle) * randomSpeed * 0.3,
            Math.abs(Math.random()) * INITIAL_VELOCITY,
            Math.sin(randomAngle) * randomSpeed * 0.3
        );
    });
}

// تابع ریست کردن توپ‌ها
function resetBalls() {
    if (!isSceneReady) return;
    
    isAnimating = false;
    gravityEnabled = false;
    balls.forEach(ball => {
        ball.position.copy(ball.userData.initialPosition);
        ball.userData.velocity.set(0, 0, 0);
        ball.userData.angularVelocity.set(0, 0, 0);
    });
}

// تابع محدود کردن سرعت
function limitVelocity(velocity) {
    const speed = velocity.length();
    if (speed > MAX_VELOCITY) {
        velocity.multiplyScalar(MAX_VELOCITY / speed);
    }
    return velocity;
}

// تابع بررسی برخورد با کف
function checkFloorCollision(ball) {
    if (!base) return false;

    const raycaster = new THREE.Raycaster(
        ball.position.clone().add(new THREE.Vector3(0, BALL_RADIUS, 0)),
        new THREE.Vector3(0, -1, 0),
        0,
        BALL_RADIUS * 4
    );

    const intersects = raycaster.intersectObject(base, true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance < BALL_RADIUS * 2) {
            ball.position.y = hit.point.y + BALL_RADIUS + 0.05;
            ball.userData.velocity.y = Math.abs(ball.userData.velocity.y) < 0.1 ? 
                0 : -ball.userData.velocity.y * RESTITUTION;
            ball.userData.velocity.multiplyScalar(FRICTION);
            if (ball.userData.velocity.length() < VELOCITY_THRESHOLD) {
                ball.userData.velocity.set(0, 0, 0);
            }
            return true;
        }
    }
    return false;
}

// تابع برخورد بین توپ‌ها
function handleBallCollision(ball1, ball2) {
    const distance = ball1.position.distanceTo(ball2.position);
    
    if (distance < BALL_RADIUS * 2) {
        const normal = ball2.position.clone().sub(ball1.position).normalize();
        const overlap = BALL_RADIUS * 2 - distance;
        
        const correction = normal.multiplyScalar(overlap * 0.6);
        ball1.position.sub(correction);
        ball2.position.add(correction);
        
        const relativeVelocity = ball2.userData.velocity.clone().sub(ball1.userData.velocity);
        const normalVelocity = normal.multiplyScalar(relativeVelocity.dot(normal));
        
        const impulse = normalVelocity.multiplyScalar(1 + RESTITUTION);
        
        ball1.userData.velocity.add(impulse.multiplyScalar(REPULSION_FORCE));
        ball2.userData.velocity.sub(impulse.multiplyScalar(REPULSION_FORCE));
        
        ball1.userData.velocity = limitVelocity(ball1.userData.velocity);
        ball2.userData.velocity = limitVelocity(ball2.userData.velocity);
    }
}

// تابع محاسبه جاذبه بر اساس چرخش محفظه
function calculateGravityVector() {
    // محاسبه جهت رو به بالای محفظه
    const containerUp = new THREE.Vector3(0, 1, 0);
    containerUp.applyQuaternion(camera.quaternion);
    
    // محاسبه جهت جاذبه (معکوس جهت بالا)
    const gravityDir = containerUp.clone().multiplyScalar(-1);
    
    // اعمال ضریب جاذبه
    return gravityDir.multiplyScalar(BASE_GRAVITY);
}

// تابع محاسبه نیروی لغزش بر اساس شیب
function calculateSlidingForce(ball, gravityVector) {
    // محاسبه نرمال سطح (در اینجا جهت رو به بالای محفظه)
    const surfaceNormal = new THREE.Vector3(0, 1, 0);
    
    // محاسبه مؤلفه مماسی جاذبه
    const tangentialForce = gravityVector.clone();
    const normalComponent = surfaceNormal.clone().multiplyScalar(gravityVector.dot(surfaceNormal));
    tangentialForce.sub(normalComponent);
    
    // اعمال ضریب لغزش
    return tangentialForce.multiplyScalar(TILT_FACTOR);
}

// بارگذاری مدل کف
const loader = new THREE.OBJLoader();
loader.load(
    'KAF.obj',
    function (object) {
        base = object;
        base.traverse((node) => {
            if (node.isMesh) {
                node.material = new THREE.MeshPhysicalMaterial({
                    color: 0xff8000,
                    metalness: 0.1,
                    roughness: 0.8,
                    clearcoat: 0.1,
                    clearcoatRoughness: 0.8,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1
                });
                node.castShadow = false;
                node.receiveShadow = true;
            }
        });
        
        base.position.set(0, -5, 0);
        base.scale.set(0.36, 0.36, 0.36);
        scene.add(base);
        
        initializeBalls();
        isSceneReady = true;
        animate();
    },
    xhr => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
    error => console.error('Error loading OBJ model:', error)
);

// Event Listeners
document.getElementById('resetButton').addEventListener('click', resetBalls);
renderer.domElement.addEventListener('click', launchBalls);
renderer.domElement.addEventListener('touchstart', (event) => {
    event.preventDefault();
    launchBalls();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// تابع انیمیشن اصلی
function animate() {
    if (!isSceneReady) return;
    
    requestAnimationFrame(animate);
    controls.update();

    if (isAnimating && base) {
        // محاسبه بردار جاذبه بر اساس چرخش محفظه
        const gravityVector = calculateGravityVector();
        
        balls.forEach(ball => {
            if (gravityEnabled) {
                // اعمال جاذبه در جهت محاسبه شده
                ball.userData.velocity.add(gravityVector);
                
                // محاسبه و اعمال نیروی لغزش
                const slidingForce = calculateSlidingForce(ball, gravityVector);
                ball.userData.velocity.add(slidingForce);
            }
            
            ball.userData.velocity.multiplyScalar(AIR_RESISTANCE);
            ball.userData.velocity = limitVelocity(ball.userData.velocity);
            
            const oldPosition = ball.position.clone();
            ball.position.add(ball.userData.velocity);
            
            // بررسی برخورد با کف با در نظر گرفتن چرخش
            if (checkFloorCollision(ball)) {
                if (ball.position.y < oldPosition.y) {
                    ball.position.copy(oldPosition);
                    
                    // اعمال نیروی لغزش بیشتر پس از برخورد
                    const extraSlide = calculateSlidingForce(ball, gravityVector).multiplyScalar(2);
                    ball.userData.velocity.add(extraSlide);
                }
            }
            
            const distanceFromCenter = ball.position.length();
            if (distanceFromCenter > radius - BALL_RADIUS) {
                const normal = ball.position.clone().normalize();
                ball.position.copy(normal.multiplyScalar(radius - BALL_RADIUS - 0.1));
                const reflection = ball.userData.velocity.reflect(normal);
                ball.userData.velocity.copy(reflection.multiplyScalar(RESTITUTION * 0.8));
                ball.userData.velocity = limitVelocity(ball.userData.velocity);
                
                // اعمال نیروی لغزش اضافی در برخورد با دیواره
                const wallSlide = calculateSlidingForce(ball, gravityVector).multiplyScalar(1.5);
                ball.userData.velocity.add(wallSlide);
            }
        });

        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                handleBallCollision(balls[i], balls[j]);
            }
        }
    }
    
    renderer.render(scene, camera);
}
