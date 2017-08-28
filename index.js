window.addEventListener('DOMContentLoaded', init);

function init() {
  function TicTacToe ({side = 100, putIn = document.body, localStorageKey}) {

    let container = document.createElement('div');
    let board = document.createElement('table');
    let messageWindow = document.createElement('span');
    let newGameButton = document.createElement('button');
    let crossIsNext = false;

    messageWindow.classList.add('messageWindow');

    newGameButton.classList.add('newGameButton');
    newGameButton.textContent = 'Новая игра';
    newGameButton.addEventListener('click', startNewGame);

    container.style.width = side + 'px';
    container.style.height = side + 50 + 'px';
    container.classList.add('container');

    board.style.width = board.style.height = side + 'px';
    board.classList.add('board');

    container.appendChild(board);
    container.appendChild(newGameButton);
    container.appendChild(messageWindow);

    // создаем объект модального окна
    let modalWindow = {
      bgScreen: null,
      messageWindow: null,
      initWindow: function(height, width) {

        if (document.body.contains(this.messageWindow)) {
          this.messageWindow.remove();
          this.bgScreen.remove();
        }

        this.bgScreen = document.createElement('div');
        this.messageWindow = document.createElement('div');

        this.messageWindow.style.height = height + 'px';
        this.messageWindow.style.width = width + 'px';

        this.messageWindow.classList.add('enterBoardSizeWindow');
        this.bgScreen.classList.add('bgScreen');

        document.body.appendChild(this.bgScreen);
        document.body.appendChild(this.messageWindow);

        this.messageWindow.style.top = (document.documentElement.clientHeight / 2) - parseInt(getComputedStyle(this.messageWindow).height) / 2 + 'px';
        this.messageWindow.style.left = (document.documentElement.clientWidth / 2) - parseInt(getComputedStyle(this.messageWindow).width) / 2 + 'px';
      },
      showWindow: function() {
        this.messageWindow.style.display = 'block';
        this.bgScreen.style.display = 'block';
      },
      hideWindow: function() {
        this.messageWindow.innerHTML = '';
        this.messageWindow.style.display = 'none';
        this.bgScreen.style.display = 'none';
      },
      addElements: function() {
        let elemNumber = arguments.length;
        console.log(elemNumber);
        if (elemNumber > 0) {
          let that = this;
          [].forEach.call(arguments, function(elem){
            console.log(this.messageWindow);
            that.messageWindow.appendChild(elem);
          });
        }
      }
    };

    //размер поля вида boardSize * boardSize
    let boardSize;
    //создать пустой объект для записи состояния
    let stateObj;
    // если в localStorage есть сейвы, поднять их. Если сейвов нет создать новый объект состояния
    if (localStorageKey && window.localStorage.getItem(localStorageKey)) {
      continueGame();
    } else {
      askBoardSize();
    }

    function initiateGame() {
      let restoreGameObj = arguments[0];
      let boardInnerHTML = '';
      for (let i = 0, counter = 1; i < boardSize; i++) {
        boardInnerHTML += '<tr>';
        for (let k = 1; k <= boardSize; k++) {
          boardInnerHTML += `<td data-value=${counter++}></td>`;
        }
        boardInnerHTML += '</tr>';
      }

      board.innerHTML = boardInnerHTML;

      if (!document.body.contains(container)) {
        putIn.appendChild(container);
      }

      if (restoreGameObj) {
        for (let i = 0; i < board.rows.length; i++) {
          for (let k = 0; k < board.rows[i].cells.length; k++) {
            //если в функцию передали параметром объект состояния, то заполнить ячейки сохраненными значениями
            let cellSign = stateObj.cells[k + i * boardSize];
            board.rows[i].cells[k].className = cellSign ? cellSign : '';
          }
        }
      }
      if (restoreGameObj) {
        crossIsNext = restoreGameObj.crossIsNext;
      } else {
        crossIsNext = Math.random() * 50 > 25;
      }

      whosTurnIsNow();

      board.addEventListener('click', nextStep);
    }

    function whosTurnIsNow() {
      if (crossIsNext) {
        setMessage('O ходит');
      } else {
        setMessage('X ходит');
      }
    }

    function startNewGame() {
      askBoardSize();
    }

    function askBoardSize() {

      let askInput = document.createElement('input');
      let askButton = document.createElement('button');
      askButton.innerHTML = 'Начать игру';
      askButton.classList.add('askButton');

      askInput.classList.add('askInput');
      askInput.setAttribute('placeholder', 'Введите число от 3 до 10');
      askInput.type = 'number';


      modalWindow.initWindow(150, 300);
      modalWindow.addElements(askInput, askButton);
      modalWindow.showWindow();



      askInput.addEventListener('keypress', function inputHandler(e){
        if (!/^[0-9]?$/.test(e.target.value) || String.fromCharCode(e.charCode) === 'e') {
          e.preventDefault();
        }
      });
      askButton.addEventListener('click', function(e){
        if (+askInput.value < 3 || +askInput.value > 10) {
          return false;
        }
        boardSize = +askInput.value;
        //провести инициализацию объекта состояния параметрами по умолчанию
        stateObj = makeStateObj(boardSize);
        saveData();
        initiateGame();

        modalWindow.hideWindow();
        e.target.removeEventListener('click', this);
      });
    }

    function continueGame() {
      let message = document.createElement('p');
      let noButton = document.createElement('button');
      let yesButton = document.createElement('button');
      message.classList.add('msg-continue');
      message.textContent = 'Найдена сохраненнная игра. Хотите продолжить?';
      noButton.classList.add('button-no');
      noButton.innerHTML = 'Нет';
      yesButton.classList.add('button-yes');
      yesButton.innerHTML = 'Да';

      modalWindow.initWindow(150, 250);
      modalWindow.addElements(message, yesButton, noButton);
      modalWindow.showWindow();

      yesButton.addEventListener('click', function(){
        let rawData = window.localStorage.getItem(localStorageKey);
        stateObj = JSON.parse(rawData);
        boardSize = stateObj.size;

        modalWindow.hideWindow();
        //запустить новую игру с параметром "восстановления состояния"
        initiateGame(stateObj);
      });
      noButton.addEventListener('click', function(){
        modalWindow.hideWindow();
        askBoardSize();
      });
    }

    function nextStep(event) {
      if (event.target.classList.contains('o') || event.target.classList.contains('x')) {
        setMessage('Клетка занята!');
        return false;
      }
      putSymbol(event);
      let result = checkWinner(+event.target.getAttribute('data-value'));

      if (result === boardSize) {
        setMessage('O выйграли!');
        board.removeEventListener('click', nextStep);
      } else if (result === -boardSize) {
        setMessage('X выйграли!');
        board.removeEventListener('click', nextStep);
      } else {
        crossIsNext = !crossIsNext;
        whosTurnIsNow();
      }
      //записать изменения в объект состояния и сохранить данные в localStorage
      stateObj.cells[+event.target.getAttribute('data-value') - 1] = event.target.className;
      stateObj.crossIsNext = crossIsNext;
      saveData();
    }

    function setMessage(text) {
      messageWindow.textContent = text;
    }

    function putSymbol(event) {
      let sign = crossIsNext ? 'o' : 'x';
      setMessage('');
      event.target.classList.add(sign);
    }


    function checkWinner(num) {
      let winArr = makeWinnerArr(boardSize);

      winArr.forEach(function(item, i){
        if (item.indexOf(num) !== - 1) {
          if (i in stateObj.winObj) {
            if (crossIsNext) {
              stateObj.winObj[i]++;
            } else {
              stateObj.winObj[i]--;
            }
          } else {
            if (crossIsNext) {
              stateObj.winObj[i] = 1;
            } else {
              stateObj.winObj[i] = -1;
            }
          }
        }
      });
      saveData();
      for (let prop in stateObj.winObj) {
        if (stateObj.winObj[prop] === boardSize || stateObj.winObj[prop] === -boardSize) return stateObj.winObj[prop];
      }
    }

    function makeWinnerArr(size) {
      let arr = [];
      let tmpArr = [];

      // horizontals
      for (let i = 0; i < size; i++) {
        for (let k = 1; k <= size; tmpArr.push(k++ + i * size)) {}
        arr.push(tmpArr.slice());
        tmpArr.length = 0;
      }

      // verticals
      for (let i = 1; i <= size; i++) {
        for (let k = 0; k * size + 1 <= size * size; tmpArr.push(i + size * k++)) {}
        arr.push(tmpArr.slice());
        tmpArr.length = 0;
      }

      // \
      for (let i = 0; size * i + (i + 1) <= size * size; i++) {tmpArr.push(size * i + (i + 1));}
      arr.push(tmpArr.slice());
      tmpArr.length = 0;
      // /
      for (let i = 0; i < size; i++ ) {tmpArr.push(size * (1 + i) - i);}
      arr.push(tmpArr.slice());
      tmpArr.length = 0;

      return arr;
    }

    function saveData() {
      window.localStorage.setItem(localStorageKey, JSON.stringify(stateObj));
    }

    function makeStateObj(boardSize) {
      return {size: boardSize, cells: new Array(boardSize * boardSize), crossIsNext: null, winObj: {}};
    }

  }

  let myGame = new TicTacToe ({side: 400, localStorageKey: 'game'});
}