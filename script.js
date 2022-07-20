'use strict';

// const { render } = require("sass");

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;

class WorkOut{
    date = new Date()
    id = (Date.now() + '').slice(-5)
    clicks = 0;

    constructor(coords, distance, duration){
        this.coords = coords; //?[lat, lng]
        this.distance = distance; //?km
        this.duration = duration; //?min
    }

    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click(){
        this.clicks++;
    }
}

class Running extends WorkOut{
    type = 'running';
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace(){
        //? min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends WorkOut{
    type = 'cycling'
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
        // this.type = 'cycling' //?same as in public fields above
    }
    calcSpeed(){
        //? km/hr
        this.speed = this.distance / (this.duration / 60) //?hrs
        return this.speed
    }
}

// const run = new Running([39,-12], 5.2, 24, 178)

// let cycling;
// setTimeout(() => {
//     cycling = new Cycling([39,-12], 27, 95, 523)
//     console.log(cycling);
// }, 1000);


// console.log(run1);


//? >>>>>>>>>>>>>>>>>>>>> APPLICATION ARCHITECTURE <<<<<<<<<<<<<<<<<<<<<<<<<<
class App{
    //?PRIVATE CLASS FIELDS
    #map;
    #mapEvent;
    #mapZoomLevel = 16;
    #workouts = [];
    constructor(){
        //?get user's position
        this._getPosition(); //?WE LAUNCH THIS FUNCTION INMEDIATELLY CUZ OF CONSTR
        
        //?Get data from local storage
        this._getLocalStorage();
        
        form.addEventListener('submit', this._newWorkOut.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);

        containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));
    }

    getWorkouts(){
        return this.#workouts;
    }

    _getPosition(){

        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition( 
                this._loadMap.bind(this), //?SUCCESS(WE USE BIND CUZ IT'S TREATED
                //?AS A REGULAR FUNCTION BECAUSE IT'S BEING CALLED IN GETCURR..)
                function(){ //!FAILED
                alert(`Couldn't get your position!`)
            });
        }
    }

    _loadMap(position){
            // console.log(position);
            // console.log(this);
            
            const {latitude} = position.coords; //?DESTRUCTURING
            const {longitude} = position.coords;
            // console.log(`https://www.google.com.mx/maps/@${latitude},${longitude}z`);
            
            const coords = [latitude, longitude];
            
                                        //?coords, zoom
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
            // console.log(map);
            // console.log(this.#map); //?THIS
            
            //?CAPA DE MOSAICO(FORMATO DEL MAPA)
            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);


            //?HANDLING CLICKS ON MAP
            this.#map.on('click', this._showForm.bind(this));

            //?eventListener from leaflet's library
            // map.on()
    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus() //?FOCUS DIRECTLY IN THE ELEMENT
    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        
    }

    _newWorkOut(e){
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        e.preventDefault();
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);


        // console.log(this);

        //? Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;
        
        //? Workout running ? create object
        if(type === 'running'){
            const cadence = +inputCadence.value;
            //? Check if data is valid
            if( 
                // !Number.isFinite(distance) || 
                // !Number.isFinite(duration) || 
                // !Number.isFinite(cadence)
                !validInput(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
            ) 
            return alert('Input have to be pos numbers!');

            //?CREATING OBJECT
            workout = new Running([lat,lng],distance,duration,cadence);
        }

        //? Workout cycling? create object 
        if(type === 'cycling'){
            const elevation = +inputDuration.value;

            if( !validInput(distance, duration, elevation) ||
                !allPositive(distance, duration)) //*elevation can be negative
            return alert('Input have to be pos numbers!');

            workout = new Cycling([lat,lng],distance,duration,elevation);
        }

        //? Add new object to workout array
        this.#workouts.push(workout);
        // console.log(workout);
        

        //? Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //? Render workout as list
        this._renderWorkout(workout);
        
        //? Hide from and clear fields
        this._hideForm();
        //?DISPLAY MARKER
        
        //?SET LOCAL STORAGE
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout){

        //?EL MARCADOR(PIN)
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250, 
            minWidth: 100, 
            autoClose: false, //?Override popup closing when another is open
            closeOnClick: false, //?Override popup closing
            className: `${workout.type}-popup`,
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃' : '🏃‍♂️'}
        ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout){

        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${
                        workout.type === 'running' ? '🏃' : '🏃‍♂️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;
        if(workout.type === 'running'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon"RunIc</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
        `}
        if(workout.type === 'cycling'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
        `}
        form.insertAdjacentHTML('afterend', html);
    }
    _hideForm(){
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => {
            form.style.display = 'grid';
        }, 1000);
    }
    _moveToPopUp(e){
        const workOutEl = e.target.closest('.workout') //?it goes to workout li
        // console.log(workOutEl);
        
        if(!workOutEl) return;
        const workout = this.#workouts.find(work => work.id === workOutEl.dataset.id)
        // console.log(workout);
        
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })

        //?Using the Public Interface
        
        //!THIS METHOD WILL NO LONGER BE AVAILABLE BECAUSE OF GETSTORAGE METHOD
        //!CONVERSION DATA TO A STRING (PROTOTYPE INHERTIANCE LOST)
        // workout.click();
    }

    _setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }
    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data);
        if(!data) return;
        this.#workouts = data;

        //?SIMULATE ASYNCHRONOUS JS WITH SETTIMEOUT
        setTimeout(() => {
            this.#workouts.forEach(work => {
                this._renderWorkout(work);
                this._renderWorkoutMarker(work);
            });
        }, 1000);
    }
    reset(){
        localStorage.removeItem('workouts')
        location.reload()
    }
}

const app = new App();


