// DOM Elements
const todayBtn = document.getElementById('today-btn');
const historyBtn = document.getElementById('history-btn');
const todayView = document.getElementById('today-view');
const historyView = document.getElementById('history-view');
const addWorkoutBtn = document.getElementById('add-workout-btn');
const exerciseModal = document.getElementById('exercise-modal');
const closeModalBtn = document.getElementById('close-modal');
const exerciseTypeSelect = document.getElementById('exercise-type');
const strengthFields = document.getElementById('strength-fields');
const cardioFields = document.getElementById('cardio-fields');
const saveExerciseBtn = document.getElementById('save-exercise');
const workoutList = document.getElementById('workout-list');
const historyList = document.getElementById('history-list');
const completeWorkoutBtn = document.getElementById('complete-workout-btn');

// Data structure
let workouts = JSON.parse(localStorage.getItem('workouts')) || [];
let workoutHistory = JSON.parse(localStorage.getItem('workoutHistory')) || [];
let currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
let userName = localStorage.getItem('userName') || '';
let workoutSchedule = JSON.parse(localStorage.getItem('workoutSchedule')) || Array(7).fill(null);
let savedWorkouts = JSON.parse(localStorage.getItem('savedWorkouts')) || Array(7).fill([]);
let currentDayIndex = new Date().getDay(); // 0 = Sunday, 6 = Saturday

// Initialize app
function initApp() {
    // Check if it's the first visit
    if (!userName) {
        showFirstTimeSetup();
    } else {
        // Set up event listeners
        todayBtn.addEventListener('click', showTodayView);
        historyBtn.addEventListener('click', showHistoryView);
        addWorkoutBtn.addEventListener('click', openExerciseModal);
        closeModalBtn.addEventListener('click', closeExerciseModal);
        exerciseTypeSelect.addEventListener('change', toggleExerciseFields);
        saveExerciseBtn.addEventListener('click', saveExercise);
        completeWorkoutBtn.addEventListener('click', completeWorkout);
        
        // Initialize customize sets button
        initCustomizeButton();
        
        // Add day selector
        addDaySelector();
        
        // Load today's workouts (default to current day)
        loadDayWorkouts(currentDayIndex);
        
        // Load workout history
        renderWorkoutHistory();
        
        // Update header with current day's workout
        updateDayHeader();
    }
}

// Initialize customize sets button
function initCustomizeButton() {
    const customizeBtn = document.getElementById('customize-sets-btn');
    if (customizeBtn) {
        customizeBtn.addEventListener('click', function() {
            const customSetsContainer = document.getElementById('custom-sets-container');
            
            if (customSetsContainer.style.display === 'none' || customSetsContainer.style.display === '') {
                customSetsContainer.style.display = 'block';
                this.textContent = 'Use Same Values for All Sets';
                generateSetsInputs();
            } else {
                customSetsContainer.style.display = 'none';
                this.textContent = 'Customize Individual Sets';
                customSetsContainer.innerHTML = '';
            }
        });
    }
    
    // Setup change listeners for default inputs
    const setsInput = document.getElementById('sets');
    const repsInput = document.getElementById('reps');
    const weightInput = document.getElementById('weight');
    
    if (setsInput && repsInput && weightInput) {
        [setsInput, repsInput, weightInput].forEach(input => {
            input.addEventListener('change', function() {
                const customSetsContainer = document.getElementById('custom-sets-container');
                if (customSetsContainer && customSetsContainer.style.display === 'block') {
                    generateSetsInputs();
                }
            });
        });
    }
}

// Toggle exercise fields based on type
function toggleExerciseFields() {
    if (exerciseTypeSelect.value === 'strength') {
        strengthFields.style.display = 'block';
        cardioFields.style.display = 'none';
    } else {
        strengthFields.style.display = 'none';
        cardioFields.style.display = 'block';
    }
}

// Open exercise modal for editing
function openEditExerciseModal(exerciseId) {
    const exercise = workouts.find(ex => ex.id === exerciseId);
    if (!exercise) return;
    
    // Fill in form with exercise data
    document.getElementById('exercise-name').value = exercise.name;
    document.getElementById('exercise-type').value = exercise.type;
    document.getElementById('notes').value = exercise.notes || '';
    
    // Set specific fields based on exercise type
    if (exercise.type === 'strength') {
        // Set strength fields
        document.getElementById('sets').value = exercise.sets.length;
        
        // If all sets have the same reps and weight, use those as defaults
        const firstSet = exercise.sets[0];
        const allSameReps = exercise.sets.every(set => set.reps === firstSet.reps);
        const allSameWeight = exercise.sets.every(set => set.weight === firstSet.weight);
        
        if (allSameReps) {
            document.getElementById('reps').value = firstSet.reps;
        }
        
        if (allSameWeight) {
            document.getElementById('weight').value = firstSet.weight > 0 ? firstSet.weight : '';
        }
        
        // Show custom sets
        const customSetsContainer = document.getElementById('custom-sets-container');
        customSetsContainer.style.display = 'block';
        document.getElementById('customize-sets-btn').textContent = 'Use Same Values for All Sets';
        
        // Generate custom set inputs with the exercise's set data
        customSetsContainer.innerHTML = '';
        exercise.sets.forEach((set, index) => {
            const setRow = document.createElement('div');
            setRow.className = 'custom-set-row';
            
            setRow.innerHTML = `
                <div class="set-number-label">Set ${set.setNumber}</div>
                <div class="set-inputs">
                    <div class="form-group set-input-group">
                        <label>Reps</label>
                        <input type="number" class="set-reps" min="1" value="${set.reps}">
                    </div>
                    <div class="form-group set-input-group">
                        <label>Weight (lbs)</label>
                        <input type="number" class="set-weight" min="0" step="2.5" value="${set.weight || ''}">
                    </div>
                </div>
            `;
            
            customSetsContainer.appendChild(setRow);
        });
    } else {
        // Set cardio fields
        document.getElementById('cardio-equipment').value = exercise.equipment;
        document.getElementById('duration').value = exercise.duration;
        document.getElementById('speed').value = exercise.speed || '';
        document.getElementById('incline').value = exercise.incline || '';
        document.getElementById('distance').value = exercise.distance || '';
        document.getElementById('calories-burned').value = exercise.caloriesBurned || '';
        document.getElementById('heart-rate').value = exercise.heartRate || '';
    }
    
    // Toggle the fields based on type
    toggleExerciseFields();
    
    // Update the save button to indicate we're editing
    saveExerciseBtn.textContent = 'Update Exercise';
    saveExerciseBtn.dataset.editing = exerciseId;
    
    // Show the modal
    exerciseModal.style.display = 'block';
}

// Save exercise to today's workout
function saveExercise() {
    const exerciseName = document.getElementById('exercise-name').value.trim();
    
    if (!exerciseName) {
        alert('Please enter an exercise name');
        return;
    }
    
    const exerciseType = exerciseTypeSelect.value;
    const notes = document.getElementById('notes').value.trim();
    
    // Check if we're editing an existing exercise
    const isEditing = saveExerciseBtn.dataset.editing;
    let exerciseData;
    
    if (isEditing) {
        // Get the existing exercise - convert ID to string for comparison since dataset values are strings
        exerciseData = workouts.find(ex => String(ex.id) === String(isEditing));
        
        // If exercise not found, create a new one instead
        if (!exerciseData) {
            console.warn('Could not find exercise with ID', isEditing, 'creating new exercise instead');
            exerciseData = {
                id: Date.now(), // Create a new ID
                name: exerciseName,
                type: exerciseType,
                notes: notes,
                completed: false,
                sets: []
            };
            workouts.push(exerciseData);
        } else {
            // Update basic properties
            exerciseData.name = exerciseName;
            exerciseData.type = exerciseType;
            exerciseData.notes = notes;
            
            // Clear existing sets
            exerciseData.sets = [];
        }
    } else {
        // Create new exercise
        exerciseData = {
            id: Date.now(), // Unique ID based on timestamp
            name: exerciseName,
            type: exerciseType,
            notes: notes,
            completed: false,
            sets: []
        };
        
        // Add to workouts array
        workouts.push(exerciseData);
    }
    
    if (exerciseType === 'strength') {
        // Check if there are custom sets
        const customSets = document.querySelectorAll('.custom-set-row');
        
        if (customSets.length > 0) {
            // Use custom sets data
            customSets.forEach((setRow, index) => {
                const reps = parseInt(setRow.querySelector('.set-reps').value) || 0;
                const weight = parseFloat(setRow.querySelector('.set-weight').value) || 0;
                
                exerciseData.sets.push({
                    setNumber: index + 1,
                    reps: reps,
                    weight: weight,
                    completed: false // Reset completion status when editing
                });
            });
        } else {
            // Use default sets data
            const numSets = parseInt(document.getElementById('sets').value);
            const reps = parseInt(document.getElementById('reps').value);
            const weight = document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : 0;
            
            for (let i = 1; i <= numSets; i++) {
                exerciseData.sets.push({
                    setNumber: i,
                    reps: reps,
                    weight: weight,
                    completed: false
                });
            }
        }
    } else { // cardio
        const equipment = document.getElementById('cardio-equipment').value;
        const duration = parseInt(document.getElementById('duration').value);
        const speed = document.getElementById('speed').value ? parseFloat(document.getElementById('speed').value) : 0;
        const incline = document.getElementById('incline').value ? parseFloat(document.getElementById('incline').value) : 0;
        const distance = document.getElementById('distance').value ? parseFloat(document.getElementById('distance').value) : 0;
        const caloriesBurned = document.getElementById('calories-burned').value ? parseInt(document.getElementById('calories-burned').value) : 0;
        const heartRate = document.getElementById('heart-rate').value ? parseInt(document.getElementById('heart-rate').value) : 0;
        
        exerciseData.equipment = equipment;
        exerciseData.duration = duration;
        exerciseData.speed = speed;
        exerciseData.incline = incline;
        exerciseData.distance = distance;
        exerciseData.caloriesBurned = caloriesBurned;
        exerciseData.heartRate = heartRate;
        exerciseData.completed = false; // Reset completion status when editing
    }
    
    // Save to current day's workouts
    saveDayWorkouts();
    
    // Render updated workouts
    renderWorkouts();
    
    // Reset edit state
    saveExerciseBtn.dataset.editing = '';
    saveExerciseBtn.textContent = 'Save Exercise';
    
    // Close modal
    closeExerciseModal();
}

// Reset form after submission or modal close
function resetExerciseForm() {
    document.getElementById('exercise-name').value = '';
    exerciseTypeSelect.value = 'strength';
    document.getElementById('sets').value = '3';
    document.getElementById('reps').value = '10';
    document.getElementById('weight').value = '';
    document.getElementById('cardio-equipment').value = 'treadmill';
    document.getElementById('duration').value = '30';
    document.getElementById('speed').value = '';
    document.getElementById('incline').value = '';
    document.getElementById('distance').value = '';
    document.getElementById('calories-burned').value = '';
    document.getElementById('heart-rate').value = '';
    document.getElementById('notes').value = '';
    
    // Clear custom sets container
    const setsContainer = document.getElementById('custom-sets-container');
    if (setsContainer) {
        setsContainer.innerHTML = '';
        setsContainer.style.display = 'none';
    }
    
    // Reset edit state
    saveExerciseBtn.dataset.editing = '';
    saveExerciseBtn.textContent = 'Save Exercise';
    
    toggleExerciseFields();
}

// Add day selector to the UI
function addDaySelector() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const daySelector = document.createElement('div');
    daySelector.className = 'day-selector';
    daySelector.innerHTML = `
        <div class="day-selector-header">Select Day:</div>
        <div class="day-selector-buttons">
            ${days.map((day, index) => `
                <button class="day-btn ${index === currentDayIndex ? 'active' : ''}" data-day="${index}">
                    ${day.substring(0, 3)}
                </button>
            `).join('')}
        </div>
    `;
    
    const workoutHeader = document.querySelector('.workout-header');
    workoutHeader.after(daySelector);
    
    // Add event listeners to day buttons
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const dayIndex = parseInt(this.dataset.day);
            
            // Save current day's workouts if any changes were made
            if (workouts.length > 0) {
                savedWorkouts[currentDayIndex] = [...workouts];
                localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
            }
            
            // Update active button
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update current day index
            currentDayIndex = dayIndex;
            
            // Load selected day's workouts
            loadDayWorkouts(dayIndex);
            
            // Update header
            updateDayHeader();
        });
    });
}

// Load workouts for a specific day
function loadDayWorkouts(dayIndex) {
    // Load saved workouts for the day
    workouts = [...(savedWorkouts[dayIndex] || [])];
    
    // Render workouts
    renderWorkouts();
    
    // Update workout type in header
    updateDayHeader();
}

// Save current day's workouts
function saveDayWorkouts() {
    savedWorkouts[currentDayIndex] = [...workouts];
    localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
}

// First time setup
function showFirstTimeSetup() {
    // Create setup modal
    const setupModal = document.createElement('div');
    setupModal.className = 'modal';
    setupModal.id = 'setup-modal';
    setupModal.style.display = 'block';
    
    setupModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Welcome to FitTrack!</h3>
            </div>
            <div class="modal-body">
                <div class="setup-step" id="name-step">
                    <h4>What's your name?</h4>
                    <div class="form-group">
                        <input type="text" id="user-name" placeholder="Enter your name">
                    </div>
                    <button id="next-to-schedule" class="primary-btn">Next</button>
                </div>
                
                <div class="setup-step" id="schedule-step" style="display: none;">
                    <h4>Set up your weekly workout schedule</h4>
                    <p class="setup-description">Define what you'll be working on each day of the week.</p>
                    
                    <div id="days-container">
                        ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => `
                            <div class="day-setup">
                                <h5>${day}</h5>
                                <div class="form-group">
                                    <select id="day-${index}" class="day-select">
                                        <option value="rest">Rest Day</option>
                                        <option value="full">Full Body</option>
                                        <option value="upper">Upper Body</option>
                                        <option value="lower">Lower Body</option>
                                        <option value="push">Push</option>
                                        <option value="pull">Pull</option>
                                        <option value="legs">Legs</option>
                                        <option value="cardio">Cardio</option>
                                        <option value="custom">Custom...</option>
                                    </select>
                                    <input type="text" id="custom-day-${index}" class="custom-day-input" placeholder="Custom workout name" style="display: none;">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button id="finish-setup" class="primary-btn">Start Tracking!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(setupModal);
    
    // Set up event listeners for the setup process
    document.getElementById('next-to-schedule').addEventListener('click', () => {
        const nameInput = document.getElementById('user-name');
        if (nameInput.value.trim()) {
            userName = nameInput.value.trim();
            localStorage.setItem('userName', userName);
            
            document.getElementById('name-step').style.display = 'none';
            document.getElementById('schedule-step').style.display = 'block';
        } else {
            alert('Please enter your name to continue.');
        }
    });
    
    // Event listeners for custom workout options
    document.querySelectorAll('.day-select').forEach((select, index) => {
        select.addEventListener('change', function() {
            const customInput = document.getElementById(`custom-day-${index}`);
            if (this.value === 'custom') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        });
    });
    
    // Finish setup button
    document.getElementById('finish-setup').addEventListener('click', () => {
        // Save the schedule
        const schedule = [];
        for (let i = 0; i < 7; i++) {
            const daySelect = document.getElementById(`day-${i}`);
            let dayValue = daySelect.value;
            
            if (dayValue === 'custom') {
                const customValue = document.getElementById(`custom-day-${i}`).value.trim();
                dayValue = customValue || 'Custom workout';
            }
            
            schedule.push(dayValue);
        }
        
        workoutSchedule = schedule;
        localStorage.setItem('workoutSchedule', JSON.stringify(workoutSchedule));
        
        // Initialize empty saved workouts array for each day
        savedWorkouts = Array(7).fill().map(() => []);
        localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
        
        // Remove setup modal and initialize the app
        document.body.removeChild(setupModal);
        
        // Set up event listeners
        todayBtn.addEventListener('click', showTodayView);
        historyBtn.addEventListener('click', showHistoryView);
        addWorkoutBtn.addEventListener('click', openExerciseModal);
        closeModalBtn.addEventListener('click', closeExerciseModal);
        exerciseTypeSelect.addEventListener('change', toggleExerciseFields);
        saveExerciseBtn.addEventListener('click', saveExercise);
        completeWorkoutBtn.addEventListener('click', completeWorkout);
        
        // Add day selector
        addDaySelector();
        
        // Render UI
        renderWorkouts();
        renderWorkoutHistory();
        updateDayHeader();
    });
}

// Schedule editor function
function openScheduleEditor() {
    // Create schedule editor modal
    const scheduleModal = document.createElement('div');
    scheduleModal.className = 'modal';
    scheduleModal.id = 'schedule-modal';
    scheduleModal.style.display = 'block';
    
    scheduleModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Workout Schedule</h3>
                <button class="close-btn schedule-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div id="edit-days-container">
                    ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                        const currentValue = workoutSchedule[index];
                        const isCustom = !['rest', 'full', 'upper', 'lower', 'push', 'pull', 'legs', 'cardio'].includes(currentValue);
                        
                        return `
                            <div class="day-setup">
                                <h5>${day}</h5>
                                <div class="form-group">
                                    <select id="edit-day-${index}" class="day-select">
                                        <option value="rest" ${currentValue === 'rest' ? 'selected' : ''}>Rest Day</option>
                                        <option value="full" ${currentValue === 'full' ? 'selected' : ''}>Full Body</option>
                                        <option value="upper" ${currentValue === 'upper' ? 'selected' : ''}>Upper Body</option>
                                        <option value="lower" ${currentValue === 'lower' ? 'selected' : ''}>Lower Body</option>
                                        <option value="push" ${currentValue === 'push' ? 'selected' : ''}>Push</option>
                                        <option value="pull" ${currentValue === 'pull' ? 'selected' : ''}>Pull</option>
                                        <option value="legs" ${currentValue === 'legs' ? 'selected' : ''}>Legs</option>
                                        <option value="cardio" ${currentValue === 'cardio' ? 'selected' : ''}>Cardio</option>
                                        <option value="custom" ${isCustom ? 'selected' : ''}>Custom...</option>
                                    </select>
                                    <input type="text" id="edit-custom-day-${index}" class="custom-day-input" 
                                           placeholder="Custom workout name" 
                                           value="${isCustom ? currentValue : ''}" 
                                           style="display: ${isCustom ? 'block' : 'none'};">
                                </div>
                                <button id="edit-exercises-day-${index}" class="secondary-btn day-edit-btn">
                                    Edit Exercises
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <button id="save-schedule" class="primary-btn">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(scheduleModal);
    
    // Event listeners for custom workout options
    document.querySelectorAll('[id^="edit-day-"]').forEach((select, index) => {
        select.addEventListener('change', function() {
            const customInput = document.getElementById(`edit-custom-day-${index}`);
            if (this.value === 'custom') {
                customInput.style.display = 'block';
            } else {
                customInput.style.display = 'none';
            }
        });
    });
    
    // Event listeners for edit exercises buttons
    document.querySelectorAll('[id^="edit-exercises-day-"]').forEach((button, index) => {
        button.addEventListener('click', function() {
            // Save the current schedule
            saveSchedule();
            
            // Close the schedule modal
            document.body.removeChild(scheduleModal);
            
            // Change to that day's exercises
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.day-btn[data-day="${index}"]`).classList.add('active');
            
            // Save current day's workouts
            if (workouts.length > 0) {
                savedWorkouts[currentDayIndex] = [...workouts];
                localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
            }
            
            // Update current day index
            currentDayIndex = index;
            
            // Load selected day's workouts
            loadDayWorkouts(index);
        });
    });
    
    // Helper function to save schedule changes
    function saveSchedule() {
        const schedule = [];
        for (let i = 0; i < 7; i++) {
            const daySelect = document.getElementById(`edit-day-${i}`);
            let dayValue = daySelect.value;
            
            if (dayValue === 'custom') {
                const customValue = document.getElementById(`edit-custom-day-${i}`).value.trim();
                dayValue = customValue || 'Custom workout';
            }
            
            schedule.push(dayValue);
        }
        
        workoutSchedule = schedule;
        localStorage.setItem('workoutSchedule', JSON.stringify(workoutSchedule));
        
        // Update header
        updateDayHeader();
    }
    
    // Close button
    document.querySelector('.schedule-close-btn').addEventListener('click', () => {
        document.body.removeChild(scheduleModal);
    });
    
    // Save changes button
    document.getElementById('save-schedule').addEventListener('click', () => {
        // Save the updated schedule
        saveSchedule();
        
        // Remove modal
        document.body.removeChild(scheduleModal);
    });
}

// Update header with current day's workout
function updateDayHeader() {
    const today = new Date();
    const dayOfWeek = currentDayIndex;
    const workoutType = workoutSchedule[dayOfWeek];
    
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const workoutName = formatWorkoutName(workoutType);
    
    document.querySelector('.workout-header h2').innerHTML = `
        ${dayName} - ${workoutName}
        <button id="edit-schedule-btn" class="icon-btn">
            <i class="fas fa-edit"></i>
        </button>
    `;
    
    // Add event listener for the edit button
    document.getElementById('edit-schedule-btn').addEventListener('click', openScheduleEditor);
}

// Format workout name for display
function formatWorkoutName(type) {
    if (type === 'rest') return 'Rest Day';
    if (type === 'full') return 'Full Body';
    if (type === 'upper') return 'Upper Body';
    if (type === 'lower') return 'Lower Body';
    if (type === 'push') return 'Push Day';
    if (type === 'pull') return 'Pull Day';
    if (type === 'legs') return 'Leg Day';
    if (type === 'cardio') return 'Cardio Day';
    return type; // Custom name
}

// View toggle functions
function showTodayView() {
    todayView.classList.add('active-view');
    historyView.classList.remove('active-view');
    todayBtn.classList.add('active');
    historyBtn.classList.remove('active');
}

function showHistoryView() {
    historyView.classList.add('active-view');
    todayView.classList.remove('active-view');
    historyBtn.classList.add('active');
    todayBtn.classList.remove('active');
}

// Modal functions
function openExerciseModal() {
    exerciseModal.style.display = 'block';
    document.getElementById('exercise-name').focus();
}

function closeExerciseModal() {
    exerciseModal.style.display = 'none';
    resetExerciseForm();
}

// Generate sets input fields
function generateSetsInputs() {
    const setsContainer = document.getElementById('custom-sets-container');
    setsContainer.innerHTML = ''; // Clear existing sets
    
    const numSets = parseInt(document.getElementById('sets').value) || 1;
    const defaultReps = parseInt(document.getElementById('reps').value) || 10;
    const defaultWeight = document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : 0;
    
    for (let i = 1; i <= numSets; i++) {
        const setRow = document.createElement('div');
        setRow.className = 'custom-set-row';
        
        setRow.innerHTML = `
            <div class="set-number-label">Set ${i}</div>
            <div class="set-inputs">
                <div class="form-group set-input-group">
                    <label>Reps</label>
                    <input type="number" class="set-reps" min="1" value="${defaultReps}">
                </div>
                <div class="form-group set-input-group">
                    <label>Weight (lbs)</label>
                    <input type="number" class="set-weight" min="0" step="2.5" value="${defaultWeight}">
                </div>
            </div>
        `;
        
        setsContainer.appendChild(setRow);
    }
}

// Save workouts to localStorage
function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workouts));
    
    // Also save to the current day's saved workouts
    saveDayWorkouts();
}

// Save workout history to localStorage
function saveWorkoutHistory() {
    localStorage.setItem('workoutHistory', JSON.stringify(workoutHistory));
}

// Complete workout and move to history
function completeWorkout() {
    if (workouts.length === 0) {
        alert('Add at least one exercise before completing the workout');
        return;
    }
    
    // Check if any exercises were completed
    const anyCompleted = workouts.some(exercise => 
        exercise.completed || 
        (exercise.sets && exercise.sets.some(set => set.completed))
    );
    
    if (!anyCompleted) {
        alert('Complete at least one exercise or set before finishing the workout');
        return;
    }
    
    // Create workout history entry
    const today = new Date();
    const dayOfWeek = currentDayIndex;
    const workoutType = workoutSchedule[dayOfWeek];
    
    const historyEntry = {
        date: currentDate,
        timestamp: Date.now(),
        dayOfWeek: dayOfWeek,
        workoutType: workoutType,
        exercises: [...workouts]
    };
    
    // Add to history
    workoutHistory.push(historyEntry);
    
    // Save history
    saveWorkoutHistory();
    
    // Clear today's workouts
    workouts = [];
    savedWorkouts[currentDayIndex] = [];
    localStorage.setItem('savedWorkouts', JSON.stringify(savedWorkouts));
    
    // Update UI
    renderWorkouts();
    renderWorkoutHistory();
    
    // Show confirmation
    alert('Workout completed and saved to history!');
    
    // Switch to history view
    showHistoryView();
}

// Toggle all sets in an exercise
function toggleAllSets(exerciseId, completed) {
    const exercise = workouts.find(ex => ex.id === exerciseId);
    if (exercise && exercise.type === 'strength') {
        exercise.sets.forEach(set => {
            set.completed = completed;
        });
        exercise.completed = completed;
        saveWorkouts();
        renderWorkouts();
    }
}

// Remove exercise from current day's workout
function removeExercise(exerciseId) {
    workouts = workouts.filter(ex => ex.id !== exerciseId);
    saveWorkouts();
    renderWorkouts();
}

// Render today's workouts
function renderWorkouts() {
    workoutList.innerHTML = '';
    
    if (workouts.length === 0) {
        workoutList.innerHTML = `
            <div class="empty-state">
                <p>No exercises added yet. Click "Add Exercise" to get started!</p>
            </div>
        `;
        return;
    }
    
    workouts.forEach((exercise) => {
        const exerciseCard = document.createElement('div');
        exerciseCard.className = 'exercise-card';
        exerciseCard.dataset.id = exercise.id;
        
        let exerciseContent = '';
        
        // Exercise header
        exerciseContent += `
            <div class="exercise-header">
                <h3 class="exercise-title">${exercise.name}</h3>
                <div class="exercise-controls">
                    <span class="exercise-type-badge">${exercise.type === 'strength' ? 'Strength' : 'Cardio'}</span>
                    <button class="icon-btn edit-exercise-btn" data-id="${exercise.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn remove-exercise-btn" data-id="${exercise.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Exercise details
        if (exercise.type === 'strength') {
            // Add "Mark All" option for strength exercises
            exerciseContent += `
                <div class="exercise-actions">
                    <button class="mark-all-btn" data-exercise-id="${exercise.id}" data-action="complete">
                        Mark All Complete
                    </button>
                    <button class="mark-all-btn" data-exercise-id="${exercise.id}" data-action="reset">
                        Reset All
                    </button>
                </div>
            `;
            
            // Render sets for strength training
            exerciseContent += `<div class="set-list">`;
            
            exercise.sets.forEach((set, index) => {
                exerciseContent += `
                    <div class="set-item" data-set="${index}">
                        <div class="set-info">
                            <span class="set-number">${set.setNumber}</span>
                            <span>${set.reps} reps × ${set.weight > 0 ? set.weight + ' lbs' : 'bodyweight'}</span>
                        </div>
                        <div class="completion-checkbox">
                            <input type="checkbox" id="set-${exercise.id}-${index}" class="checkbox set-checkbox" ${set.completed ? 'checked' : ''}>
                            <label for="set-${exercise.id}-${index}" class="checkbox-label">
                                <i class="fas fa-check" style="display: ${set.completed ? 'inline-block' : 'none'}"></i>
                            </label>
                        </div>
                    </div>
                `;
            });
            
            exerciseContent += `</div>`;
        } else {
            // Render cardio details
            exerciseContent += `
                <div class="exercise-details">
                    <div class="detail-item">
                        <span class="detail-label">Equipment:</span>
                        <span>${capitalizeFirstLetter(exercise.equipment)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span>
                        <span>${exercise.duration} min</span>
                    </div>
                    ${exercise.speed ? `
                        <div class="detail-item">
                            <span class="detail-label">Speed:</span>
                            <span>${exercise.speed}</span>
                        </div>
                    ` : ''}
                    ${exercise.incline ? `
                        <div class="detail-item">
                            <span class="detail-label">Incline/Resistance:</span>
                            <span>${exercise.incline}</span>
                        </div>
                    ` : ''}
                    ${exercise.distance ? `
                        <div class="detail-item">
                            <span class="detail-label">Distance:</span>
                            <span>${exercise.distance} miles</span>
                        </div>
                    ` : ''}
                    ${exercise.caloriesBurned ? `
                        <div class="detail-item">
                            <span class="detail-label">Calories Burned:</span>
                            <span>${exercise.caloriesBurned}</span>
                        </div>
                    ` : ''}
                    ${exercise.heartRate ? `
                        <div class="detail-item">
                            <span class="detail-label">Heart Rate:</span>
                            <span>${exercise.heartRate} bpm</span>
                        </div>
                    ` : ''}
                    <div class="set-item">
                        <div class="set-info">
                            <span>Mark as completed</span>
                        </div>
                        <div class="completion-checkbox">
                            <input type="checkbox" id="exercise-${exercise.id}" class="checkbox exercise-checkbox" ${exercise.completed ? 'checked' : ''}>
                            <label for="exercise-${exercise.id}" class="checkbox-label">
                                <i class="fas fa-check" style="display: ${exercise.completed ? 'inline-block' : 'none'}"></i>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Notes section if there are notes
        if (exercise.notes) {
            exerciseContent += `
                <div class="notes-section">
                    <h4 class="notes-header">Notes</h4>
                    <p class="notes-content">${exercise.notes}</p>
                </div>
            `;
        }
        
        exerciseCard.innerHTML = exerciseContent;
        workoutList.appendChild(exerciseCard);
        
        // Add event listeners to checkboxes
        if (exercise.type === 'strength') {
            // Add event listeners for "Mark All" buttons
            const markAllCompleteBtn = exerciseCard.querySelector('[data-action="complete"]');
            markAllCompleteBtn.addEventListener('click', () => {
                toggleAllSets(exercise.id, true);
            });
            
            const markAllResetBtn = exerciseCard.querySelector('[data-action="reset"]');
            markAllResetBtn.addEventListener('click', () => {
                toggleAllSets(exercise.id, false);
            });
            
            // Add event listeners for individual set checkboxes
            const setCheckboxes = exerciseCard.querySelectorAll('.set-checkbox');
            setCheckboxes.forEach((checkbox, index) => {
                checkbox.addEventListener('change', () => {
                    exercise.sets[index].completed = checkbox.checked;
                    
                    // Update exercise completion status
                    exercise.completed = exercise.sets.every(set => set.completed);
                    
                    // Update the label to show/hide the checkmark
                    const checkIcon = checkbox.nextElementSibling.querySelector('i');
                    checkIcon.style.display = checkbox.checked ? 'inline-block' : 'none';
                    
                    saveWorkouts();
                });
            });
        } else {
            const exerciseCheckbox = exerciseCard.querySelector('.exercise-checkbox');
            exerciseCheckbox.addEventListener('change', () => {
                exercise.completed = exerciseCheckbox.checked;
                
                // Update the label to show/hide the checkmark
                const checkIcon = exerciseCheckbox.nextElementSibling.querySelector('i');
                checkIcon.style.display = exerciseCheckbox.checked ? 'inline-block' : 'none';
                
                saveWorkouts();
            });
        }
        
        // Add event listener to edit button
        const editBtn = exerciseCard.querySelector('.edit-exercise-btn');
        editBtn.addEventListener('click', () => {
            openEditExerciseModal(exercise.id);
        });
        
        // Add event listener to remove button
        const removeBtn = exerciseCard.querySelector('.remove-exercise-btn');
        removeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove this exercise?')) {
                removeExercise(exercise.id);
            }
        });
    });
}

// Render workout history
function renderWorkoutHistory() {
    historyList.innerHTML = '';
    
    if (workoutHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>No workout history yet. Complete a workout to see it here!</p>
            </div>
        `;
        return;
    }
    
    // Sort history by date, newest first
    workoutHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    workoutHistory.forEach((workout) => {
        const historyCard = document.createElement('div');
        historyCard.className = 'history-card';
        
        // Count total exercises
        const totalExercises = workout.exercises.length;
        
        // Count completed exercises
        const completedExercises = workout.exercises.filter(ex => 
            ex.completed || (ex.sets && ex.sets.some(set => set.completed))
        ).length;
        
        // Calculate completion percentage
        const completionRate = Math.round((completedExercises / totalExercises) * 100) || 0;
        
        // Format date
        const formattedDate = formatDate(workout.date);
        
        // Get workout type
        const workoutTypeName = workout.workoutType ? formatWorkoutName(workout.workoutType) : 'Workout';
        
        let historyContent = `
            <div class="history-date">
                <span>${formattedDate}</span>
                <span class="history-workout-type">${workoutTypeName}</span>
            </div>
            <div class="history-summary">
                <div class="history-stats">
                    <div class="history-stat">
                        <span class="history-stat-value">${totalExercises}</span>
                        <span class="history-stat-label">Exercise${totalExercises !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="history-stat">
                        <span class="history-stat-value">${completionRate}%</span>
                        <span class="history-stat-label">Completed</span>
                    </div>
                </div>
            </div>
            <button class="expand-history-btn">Show Details</button>
            <div class="history-details" style="display: none;">
        `;
        
        // Add detailed exercise information
        workout.exercises.forEach((exercise) => {
            let exerciseCompleted = false;
            
            if (exercise.type === 'strength') {
                const completedSets = exercise.sets.filter(set => set.completed).length;
                exerciseCompleted = completedSets > 0;
                
                historyContent += `
                    <div class="history-exercise-item ${exerciseCompleted ? 'completed' : 'incomplete'}">
                        <div class="history-exercise-header">
                            <strong>${exercise.name}</strong>
                            <span class="completion-status">
                                ${completedSets}/${exercise.sets.length} sets
                            </span>
                        </div>
                        <div class="history-exercise-sets">
                `;
                
                exercise.sets.forEach(set => {
                    historyContent += `
                        <div class="history-set-item ${set.completed ? 'completed' : 'incomplete'}">
                            <span>Set ${set.setNumber}: ${set.reps} reps × ${set.weight > 0 ? set.weight + ' lbs' : 'bodyweight'}</span>
                            <span class="set-status">${set.completed ? '&#x2705;' : '&#x274C;'}</span>
                        </div>
                    `;
                });
                
                historyContent += `</div>`;
            } else {
                exerciseCompleted = exercise.completed;
                
                historyContent += `
                    <div class="history-exercise-item ${exerciseCompleted ? 'completed' : 'incomplete'}">
                        <div class="history-exercise-header">
                            <strong>${exercise.name}</strong>
                            <span class="completion-status">
                                ${exerciseCompleted ? 'Completed' : 'Incomplete'}
                            </span>
                        </div>
                        <div class="history-exercise-details">
                            <span>${exercise.duration} min on ${capitalizeFirstLetter(exercise.equipment)}</span>
                            ${exercise.speed ? `<span>Speed: ${exercise.speed}</span>` : ''}
                            ${exercise.incline ? `<span>Incline/Resistance: ${exercise.incline}</span>` : ''}
                            ${exercise.distance ? `<span>Distance: ${exercise.distance} miles</span>` : ''}
                            ${exercise.caloriesBurned ? `<span>Calories Burned: ${exercise.caloriesBurned}</span>` : ''}
                            ${exercise.heartRate ? `<span>Heart Rate: ${exercise.heartRate} bpm</span>` : ''}
                        </div>
                    </div>
                `;
            }
            
            // Add notes if any
            if (exercise.notes) {
                historyContent += `
                    <div class="history-exercise-notes">
                        <em>Notes: ${exercise.notes}</em>
                    </div>
                `;
            }
        });
        
        historyContent += `</div>`; // Close history-details
        
        historyCard.innerHTML = historyContent;
        historyList.appendChild(historyCard);
        
        // Add event listener for expand button
        const expandBtn = historyCard.querySelector('.expand-history-btn');
        const detailsSection = historyCard.querySelector('.history-details');
        
        expandBtn.addEventListener('click', () => {
            const isExpanded = detailsSection.style.display === 'block';
            detailsSection.style.display = isExpanded ? 'none' : 'block';
            expandBtn.textContent = isExpanded ? 'Show Details' : 'Hide Details';
        });
    });
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to format date
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// When user clicks outside the modal, close it
window.addEventListener('click', (event) => {
    if (event.target === exerciseModal) {
        closeExerciseModal();
    }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 