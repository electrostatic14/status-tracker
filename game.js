// 1. Глобальные переменные состояния
let lastTime = performance.now(); 

const game = {
    scene: null,
    camera: null,
    renderer: null,
    organs: {},
    particles: [],
    currentOperation: null,
    currentTool: 'scalpel',
    currentTaskIndex: 0,
    tasks: [],
    patient: { health: 100, oxygen: 100, blood: 100 },
    timer: 0,
    startTime: 0,
    accuracy: 100,
    mistakes: 0,
    isPerformingAction: false,
    actionProgress: 0,
    interactionTarget: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    audioContext: null,
    currentOperationType: null,
    isRunning: false
};

// 2. База данных операций
const OPERATIONS = {
    appendix: {
        name: 'Аппендэктомия',
        duration: 300,
        xp: 100,
        organType: 'appendix',
        tasks: [
            { tool: 'syringe', text: 'Введите анестезию', target: 'body', actionTime: 2 },
            { tool: 'scalpel', text: 'Сделайте разрез', target: 'body', actionTime: 3 },
            { tool: 'forceps', text: 'Отведите ткани', target: 'appendix', actionTime: 2 },
            { tool: 'cautery', text: 'Остановите кровотечение', target: 'appendix', actionTime: 2 },
            { tool: 'scalpel', text: 'Отсеките аппендикс', target: 'appendix', actionTime: 3 },
            { tool: 'suture', text: 'Наложите швы', target: 'body', actionTime: 4 }
        ]
    },
    heart: {
        name: 'Шунтирование',
        duration: 480,
        xp: 500,
        organType: 'heart',
        tasks: [
            { tool: 'scalpel', text: 'Выполните стернотомию', target: 'body', actionTime: 5 },
            { tool: 'forceps', text: 'Установите ретрактор', target: 'heart', actionTime: 3 },
            { tool: 'syringe', text: 'Вколите кардиоплегию', target: 'heart', actionTime: 3 },
            { tool: 'suture', text: 'Наложите анастомоз', target: 'heart', actionTime: 6 },
            { tool: 'cautery', text: 'Проверьте герметичность', target: 'heart', actionTime: 3 },
            { tool: 'suture', text: 'Закройте грудную клетку', target: 'body', actionTime: 5 }
        ]
    }
};

// 3. Инициализация Three.js
function initThreeJS() {
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x050505);
    
    game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    game.camera.position.set(0, 5, 10);
    game.camera.lookAt(0, 0, 0);
    
    game.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), antialias: true });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    game.scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(5, 10, 5);
    game.scene.add(spotLight);

    renderMenuScene();
    
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('touchstart', (e) => {
        if(e.touches.length > 0) {
            game.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
            game.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            handleInteraction();
        }
    });
}

function renderMenuScene() {
    if (game.organs.body) game.scene.remove(game.organs.body);
    const geometry = new THREE.BoxGeometry(20, 1, 10);
    const material = new THREE.MeshPhongMaterial({ color: 0x444444 });
    game.organs.body = new THREE.Mesh(geometry, material);
    game.organs.body.position.y = -1;
    game.scene.add(game.organs.body);
}

function onWindowResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

// 4. Логика игры
function startOperation(operationType) {
    const operation = OPERATIONS[operationType];
    if (!operation) return;
    
    game.currentOperation = operation;
    game.currentOperationType = operationType;
    game.tasks = [...operation.tasks];
    game.currentTaskIndex = 0;
    game.timer = operation.duration;
    
    // Включаем движок
    lastTime = performance.now(); 
    game.isRunning = true;
    
    game.startTime = Date.now();
    game.patient = { health: 100, oxygen: 100, blood: 100 };
    game.accuracy = 100;
    game.mistakes = 0;
    game.actionProgress = 0;
    
    createOrgan(operation.organType);
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');
    
    updateTaskDisplay();
    updateVitalsDisplay();
    
    gameLoop();
}

function createOrgan(type) {
    Object.keys(game.organs).forEach(key => {
        if (key !== 'body') {
            game.scene.remove(game.organs[key]);
            delete game.organs[key];
        }
    });

    let geometry, material;
    if (type === 'appendix') {
        geometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 16);
        material = new THREE.MeshPhongMaterial({ color: 0xff6666 });
        const organ = new THREE.Mesh(geometry, material);
        organ.rotation.z = Math.PI / 3;
        game.organs.appendix = organ;
    } else {
        geometry = new THREE.SphereGeometry(1, 32, 32);
        material = new THREE.MeshPhongMaterial({ color: 0xff3333 });
        const organ = new THREE.Mesh(geometry, material);
        organ.userData.pulsePhase = 0;
        game.organs.heart = organ;
    }
    game.scene.add(game.organs[type]);
}

function onMouseDown(event) {
    game.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    game.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    handleInteraction();
}

function handleInteraction() {
    if (!game.currentOperation || game.isPerformingAction) return;
    
    game.raycaster.setFromCamera(game.mouse, game.camera);
    const intersects = game.raycaster.intersectObjects(game.scene.children);
    
    if (intersects.length > 0) {
        const task = game.tasks[game.currentTaskIndex];
        const clickedObj = intersects[0].object;
        
        const isCorrectTarget = (task.target === 'body' && clickedObj === game.organs.body) || 
                               (task.target === 'appendix' && clickedObj === game.organs.appendix) ||
                               (task.target === 'heart' && clickedObj === game.organs.heart);

        if (isCorrectTarget && game.currentTool === task.tool) {
            game.isPerformingAction = true;
            game.actionProgress = 0;
        } else {
            game.patient.health -= 5;
            game.accuracy -= 2;
            game.mistakes++;
            updateVitalsDisplay();
            if (game.patient.health <= 0) failOperation('Пациент скончался');
        }
    }
}

function completeTask() {
    game.currentTaskIndex++;
    if (game.currentTaskIndex >= game.tasks.length) {
        completeOperation();
    } else {
        updateTaskDisplay();
    }
}

function updateTaskDisplay() {
    const task = game.tasks[game.currentTaskIndex];
    if (task) {
        document.getElementById('currentTaskText').textContent = task.text;
        document.getElementById('taskProgress').style.width = '0%';
    }
}

function updateVitals(dt) {
    game.patient.oxygen -= 0.02 * dt;
    game.patient.blood -= 0.01 * dt;
    if (game.patient.oxygen <= 0 || game.patient.blood <= 0) {
        failOperation('Критические показатели');
    }
}

function updateVitalsDisplay() {
    document.getElementById('healthVal').textContent = Math.max(0, Math.round(game.patient.health)) + '%';
    document.getElementById('oxygenVal').textContent = Math.max(0, Math.round(game.patient.oxygen)) + '%';
    document.getElementById('bloodVal').textContent = Math.max(0, Math.round(game.patient.blood)) + '%';
}

function updateTimerDisplay() {
    const mins = Math.floor(game.timer / 60);
    const secs = Math.floor(game.timer % 60);
    document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function completeOperation() {
    game.isRunning = false;
    const elapsed = (Date.now() - game.startTime) / 1000;
    const grade = calculateGrade();
    
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('resultGrade').textContent = grade;
    document.getElementById('resultTime').textContent = Math.floor(elapsed / 60) + ':' + Math.floor(elapsed % 60).toString().padStart(2, '0');
    document.getElementById('resultHealth').textContent = Math.round(game.patient.health) + '%';
    document.getElementById('resultAccuracy').textContent = Math.round(game.accuracy) + '%';
    document.getElementById('resultXP').textContent = '+' + game.currentOperation.xp + ' XP';
}

function failOperation(reason) {
    game.isRunning = false;
    alert('Операция провалена: ' + reason);
    location.reload();
}

function calculateGrade() {
    const score = (game.patient.health + game.accuracy) / 2;
    if (score > 90) return 'S';
    if (score > 80) return 'A';
    if (score > 70) return 'B';
    return 'C';
}

// 5. ГЛАВНЫЙ ЦИКЛ
function gameLoop() {
    if (!game.isRunning || !game.currentOperation) return;
    
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 3);
    lastTime = currentTime;
    
    game.timer -= deltaTime / 60;
    if (game.timer <= 0) {
        failOperation('Время истекло');
        return;
    }
    
    updateTimerDisplay();
    updateVitals(deltaTime);
    updateVitalsDisplay();
    
    if (game.organs.heart) {
        game.organs.heart.userData.pulsePhase += 0.08 * deltaTime;
        const s = 1 + Math.sin(game.organs.heart.userData.pulsePhase) * 0.05;
        game.organs.heart.scale.set(s, s * 1.2, s * 0.9);
    }
    
    if (game.isPerformingAction) {
        const task = game.tasks[game.currentTaskIndex];
        game.actionProgress += (1 / (task.actionTime * 60)) * deltaTime;
        if (game.actionProgress >= 1) {
            game.actionProgress = 1;
            completeTask();
            game.isPerformingAction = false;
        }
        document.getElementById('taskProgress').style.width = (game.actionProgress * 100) + '%';
    }
    
    game.renderer.render(game.scene, game.camera);
    requestAnimationFrame(gameLoop);
}

// 6. Слушатели событий
document.querySelectorAll('.operation-card').forEach(card => {
    card.addEventListener('click', () => {
        startOperation(card.dataset.operation);
    });
});

document.querySelectorAll('.tool-button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        game.currentTool = btn.dataset.tool;
    });
});

document.getElementById('backToMenuBtn').addEventListener('click', () => {
    location.reload();
});

window.addEventListener('load', () => {
    initThreeJS();
    document.getElementById('loadingScreen').classList.add('hidden');
});
        
