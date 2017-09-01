window.addEventListener('DOMContentLoaded', init);

function init() {
  function TicTacToe ({side = 100, putIn = document.body, localStorageKey}) {
    //-----------------------------------------------------------------------------------------------------
    // создание "неизменяемой" части: контейнера, поля для игры, окна для вывода инфы и кнопки "Новая игра"
    let container = document.createElement('div');
    let board = document.createElement('table');
    let messageWindow = document.createElement('span');
    let changeBorderButton = document.createElement('button');
    let newGameButton = document.createElement('button');

    // кастомизируем контейнер, поле для игры, инфо-окно и кнопку
    container.style.width = side + 'px';

    // container.style.height = side + 50 + 'px';
    container.classList.add('container');
    board.style.width = board.style.height = side + 'px';
    board.classList.add('board');
    messageWindow.classList.add('gameMessageWindow');
    changeBorderButton.classList.add('changeBorderButton');
    changeBorderButton.textContent = 'Сменить поле';
    newGameButton.classList.add('newGameButton');
    newGameButton.textContent = 'Новая игра';

    // вешаем обработчик на кнопку "Новая игра" и "Смена поля"
    changeBorderButton.addEventListener('click', askUserBoardSize);
    newGameButton.addEventListener('click', clearBorder);

    // помещаем все дочерние элементы(поле для игры, месадж окно и кнопку) в контейнер
    container.appendChild(messageWindow);
    container.appendChild(board);
    container.appendChild(newGameButton);
    container.appendChild(changeBorderButton);



    // создать пустой объект для записи состояния игры
    // size - размер поля вида size * size,
    // cells - массив состояния клеток (что там находится Х, О или ничего),
    // crossIsNext - кто следующий ходит Х или О, если true то ходит Х
    // winObj - объект в который записываются состояния на основе которых можно сделать вывод кто победил
    // инициализация проводится в функции initiateStateObj
    let stateObj;
    // 0 - пока никто не выйграл
    // 1 - О победили
    // 2 - Х победили
    // 3 - ничья
    let winner = 0;

    let winArr = null;

    // создаем объект модального окна
    let modalWindow = {
      bgScreen: null,
      messageWindow: null,
      closeButton: null,
      stateOpenTimerId: null,
      initWindow: function(height, width) {

        if (document.body.contains(this.messageWindow)) {
          this.messageWindow.remove();
          this.bgScreen.remove();
        }

        this.bgScreen = document.createElement('div');
        this.messageWindow = document.createElement('div');
        this.closeButton = document.createElement('button');

        this.messageWindow.style.height = height + 'px';
        this.messageWindow.style.width = width + 'px';

        this.messageWindow.classList.add('modalWindow', 'modalWindow--hidden');
        this.bgScreen.classList.add('bgScreen', 'bgScreen--hidden');
        this.closeButton.classList.add('modalWindow__closeButton');

        this.messageWindow.appendChild(this.closeButton);
        document.body.appendChild(this.bgScreen);
        document.body.appendChild(this.messageWindow);

        this.messageWindow.style.top = (document.documentElement.clientHeight / 2) -
          parseInt(getComputedStyle(this.messageWindow).height) / 2 + 'px';
        this.messageWindow.style.left = (document.documentElement.clientWidth / 2) -
          parseInt(getComputedStyle(this.messageWindow).width) / 2 + 'px';

        this.closeButton.addEventListener('click', this.hideWindow.bind(this));
      },
      showWindow: function() {
        if (this.stateOpenTimerId) {
          clearTimeout(this.stateOpenTimerId);
        }
        let that = this;
        setTimeout(function(){
          that.messageWindow.classList.remove('modalWindow--hidden');
          that.bgScreen.classList.remove('bgScreen--hidden');
        },20);
      },
      hideWindow: function() {
        this.messageWindow.innerHTML = '';
        this.messageWindow.classList.add('modalWindow--hidden');
        this.bgScreen.classList.add('bgScreen--hidden');

        let that = this;
        this.stateOpenTimerId = setTimeout(function(){
          that.messageWindow.style.display = 'none';
          that.bgScreen.style.display = 'none';

          that.stateOpenTimerId = null;
        }, 300);
      },
      addElements: function() {
        let elemNumber = arguments.length;
        if (elemNumber > 0) {
          let that = this;
          [].forEach.call(arguments, function(elem){
            that.messageWindow.appendChild(elem);
          });
        }
      }
    };
    //----------------------------------------------------------------------------------------------------
    // ЛОГИКА

    // если в localStorage есть сейвы, загрузить их
    if (localStorageKey && window.localStorage.getItem(localStorageKey)) {
      askUserContinueGame();
    } else {
      askUserBoardSize();
    }

    function makeNewBoard() {
      let boardInnerHTML = '';
      for (let i = 0, counter = 0; i < stateObj.size; i++) {
        boardInnerHTML += '<tr>';
        for (let k = 1; k <= stateObj.size; k++) {
          boardInnerHTML += `<td data-value=${counter++}></td>`;
        }
        boardInnerHTML += '</tr>';
      }
      board.innerHTML = boardInnerHTML;
    }

    function startNewGame() {
      makeNewBoard();
      if (!document.body.contains(container)) {
        putIn.appendChild(container);
      }
      // если пришли сохраненные данные из объекта состояния то crossIsNext не трогаем!
      // В противном случае делаем рандом на первый ход в игре
      if (stateObj.crossIsNext === null) {
        stateObj.crossIsNext = Math.random() * 50 > 25;
      }

      whoseTurnIsNow();
      board.addEventListener('click', nextStep);
    }

    function initiateStateObj(bSize) {
      stateObj = {size: bSize, cells: [], crossIsNext: null, occupiedCellCounter: 0, winObj: {}};
      // инициируем объект состояния выйгрыша, чтобы значения можно было инкрементировать
      for (let i = 0; i < 2 + bSize * 2; i++) {
        stateObj.winObj[i] = 0;
      }
    }

    function iterateBoardCells(callback) {
      for (let i = 0; i < board.rows.length; i++) {
        for (let k = 0; k < board.rows[i].cells.length; k++) {
          callback(board.rows[i].cells[k], i, k);
        }
      }
    }

    function restoreSavedBoard(cell, row, col) {
      //если в ячейке есть Х или О то присвоить ей этот класс, в противном случае обнолить className
      let cellSign = stateObj.cells[col + row * stateObj.size];
      cell.className = cellSign ? cellSign : '';
    }


    function whoseTurnIsNow() {
      if (stateObj.crossIsNext) {
        setTimeout(function(){setMessage('Ходит ⬤');},100);

      } else {
        setTimeout(function(){setMessage('Ходит ✘');},100);
      }
    }

    function clearBorder() {
      let tmpSize = stateObj.size;
      let tmpWinArr = winArr;
      clearAllData();

      initiateStateObj(tmpSize);
      winArr = tmpWinArr;

      startNewGame();
    }

    function askUserBoardSize() {
      let message = document.createElement('p');
      let askInput = document.createElement('input');
      let askButton = document.createElement('button');
      message.textContent = 'Введите размер игрового поля:';
      message.classList.add('message-boardSize');
      askButton.innerHTML = 'Начать игру';
      askButton.classList.add('boardSize-button');

      askInput.classList.add('boardSize-input');
      askInput.setAttribute('placeholder', 'от 3 до 10');
      askInput.type = 'number';

      modalWindow.initWindow(170, 300);
      modalWindow.addElements(message, askInput, askButton);
      modalWindow.showWindow();

      askInput.focus();

      let setMessageInput1 = setMessageTemporary (message.textContent, 'Только цифры!', 2000);
      let setMessageInput2 = setMessageTemporary (message.textContent, 'Только 2 знака!', 2000);
      let setMessageButton = setMessageTemporary (message.textContent, 'Неверное значение!', 2000);

      askInput.addEventListener('keypress', function inputHandler(e){
        if (e.keyCode === 13) {
          enterSize();
        } else if (!/\d$/.test(String.fromCharCode(e.charCode))) {
          setMessageInput1();
          e.preventDefault();
        } else if (e.target.value.length >= 2) {
          setMessageInput2();
          e.preventDefault();
        }
      });

      askButton.addEventListener('click', enterSize);

      function enterSize() {
        if (+askInput.value < 3 || +askInput.value > 10) {
          setMessageButton();
          return false;
        }

        modalWindow.hideWindow();
        clearAllData();
        initiateStateObj(+askInput.value);
        startNewGame();
      }

      function setMessageTemporary(original, temporary, time) {
        let state = null;
        return function() {
          if (state) return;
          message.textContent = temporary;
          state = 1;
            setTimeout(function(){
              message.textContent = original;
              state = null;
            }, time);
        };

      }
    }

    function askUserContinueGame() {
      let message = document.createElement('p');
      let noButton = document.createElement('button');
      let yesButton = document.createElement('button');
      message.classList.add('messageContinue');
      message.textContent = 'Найдена сохраненнная игра. Хотите продолжить?';
      noButton.classList.add('button-no');
      noButton.innerHTML = 'Нет';
      yesButton.classList.add('button-yes');
      yesButton.innerHTML = 'Да';

      modalWindow.initWindow(150, 250);
      modalWindow.addElements(message, yesButton, noButton);
      modalWindow.showWindow();

      yesButton.addEventListener('click', function(){
        modalWindow.hideWindow();
        continueGame();
      });
      noButton.addEventListener('click', function(){
        modalWindow.hideWindow();
        askUserBoardSize();
      });
    }

    function continueGame() {
      let rawData = window.localStorage.getItem(localStorageKey);
      stateObj = JSON.parse(rawData);
      startNewGame();
      iterateBoardCells(restoreSavedBoard);
    }

    function nextStep(event) {
      if (event.target.classList.contains('o') || event.target.classList.contains('x')) {
        setMessage('Клетка занята!');
        return false;
      }
      putSymbol(event);

      if(!checkWinner(+event.target.getAttribute('data-value'))) {
        stateObj.crossIsNext = !stateObj.crossIsNext;
        stateObj.cells[+event.target.getAttribute('data-value')] = event.target.className;
        saveData();
        whoseTurnIsNow();
      }
    }

    function setMessage(text) {
      messageWindow.innerHTML = text;
    }

    function putSymbol(event) {
      let sign = stateObj.crossIsNext ? 'o' : 'x';
      event.target.classList.add(sign);
      stateObj.occupiedCellCounter++;
    }


    function checkWinner(num) {
      // создаем массив всех возможных комбинаций победы
      if (!winArr) {
        winArr = makeWinnerArr(stateObj.size);
      }
      // Ключи объекта победы это номера от 0 до (2 + size * 2), где последнее выражение это максимально
      // возможное количество комбинаций победы. Проходимся по массиву комбинаций победы и смотрим, на
      // какие его элементы "ложиться" только что проставленный О или Х и уже индексы этих элементов массива
      // заносим как ключи в объект победы. Значение по ключю либо прибовляем либо отнимаем, в зависимости
      // что было поставлено О или Х. Как только в объекте победы будет значение равное size или -size,
      // то все, найден победитель
      winArr.forEach(function(item, i){
        if (item.indexOf(num) !== - 1) {
          if (i in stateObj.winObj) {
            if (stateObj.crossIsNext) {
              stateObj.winObj[i]++;
            } else {
              stateObj.winObj[i]--;
            }
          }
        }
      });

      if (stateObj.occupiedCellCounter === Math.pow(stateObj.size, 2)) {
        winner = 3;
      }
      for (let prop in stateObj.winObj) {
        if (Math.abs(stateObj.winObj[prop]) === stateObj.size) {
          winner =  stateObj.winObj[prop] > 0 ? 1 : 2;
        }
      }

      if (winner > 0) {
        board.removeEventListener('click', nextStep);
        switch(winner) {
            case 1: setMessage('Победил ⬤!'); break;
            case 2: setMessage('Победил ✘!'); break;
            case 3: setMessage('✘ Ничья! ⬤'); break;
          }
        clearStorage();
        return true;
      }
      return false;
    }


    function makeWinnerArr(size) {
      // Массив arr - содержит массивы, каждый из которых представляет отдельно возможный
      // вариант выйгрыша. Например поле игры 3на3 содержит (2 + size * 2) возможных положения
      // в которых можно выйграть. Соотвественно для 3на3 поля массив arr будет содержать
      // (2 + 3 * 2) = 8 массивов с комбинацией клеток, все из которых нужно занять чтобы победить
      let arr = [];
      let tmpArr = [];

      // гаризонтальные комбинации
      for (let i = 0; i < size; i++) {
        for (let k = 0; k < size; tmpArr.push(k++ + i * size)) {}
        arr.push(tmpArr.slice());
        tmpArr.length = 0;
      }

      // вертикальные комбинации
      for (let i = 0; i < size; i++) {
        for (let k = 0; k * size + 1 <= size * size; tmpArr.push(i + size * k++)) {}
        arr.push(tmpArr.slice());
        tmpArr.length = 0;
      }

      // \ диагональная комбинация
      for (let i = 0; size * i + (i + 1) <= size * size; i++) {tmpArr.push(size * i + i);}
      arr.push(tmpArr.slice());
      tmpArr.length = 0;
      // / диагональная комбинация
      for (let i = 0; i < size; i++ ) {tmpArr.push((i + 1) * (size - 1));}
      arr.push(tmpArr.slice());
      tmpArr.length = 0;

      return arr;
    }

    function saveData() {
      window.localStorage.setItem(localStorageKey, JSON.stringify(stateObj));
    }
    function clearAllData() {
      stateObj = null;
      winner = 0;
      winArr = null;
      window.localStorage.removeItem(localStorageKey);
    }
    function clearStorage() {
      window.localStorage.removeItem(localStorageKey);
    }
  }

  let myGame = new TicTacToe ({side: 400, localStorageKey: 'game'});
}