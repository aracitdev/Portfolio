var chip8 = function() {
    this.screenElement = document.getElementById("chip8-screen");
    this.screenContext = this.screenElement.getContext("2d");

    this.registerDisplay = document.getElementById("chip8-register-display");
    this.lastOpcodeDisplay = document.getElementById("chip8-last-instruction");
    this.debugMode = false;


    this.screenWidth = 64;
    this.screenHeight = 32;

    this.pixelScale = 10;
    this.screenContext.fillStyle = "#000000";
    this.screenElement.width = this.screenWidth * this.pixelScale;
    this.screenElement.height = this.screenHeight * this.pixelScale;
    this.isRunning = false; // so we don't run the cycle twice
    this.screenContext.fillRect(0, 0, this.screenWidth * this.pixelScale, this.screenHeight * this.pixelScale);

    this.reset();
}

chip8.prototype.updateDebugDisplay = function() {
    if(!this.debugMode) return;

    var debugString = "";
    for(var i = 0; i < this.V.length; i++)
        debugString += "V" + i.toString(16) + ": " + this.V[i].toString(16) + " ";
    debugString += "I: " + this.I.toString(16) + " ";
    debugString += "DT: " + this.DT.toString(16) + " ";
    debugString += "ST: " + this.ST.toString(16) + " ";
    debugString += "PC: " + this.PC.toString(16) + " ";
    debugString += "SP: " + this.SP.toString(16) + " ";

    this.registerDisplay.innerText = debugString;

    this.lastOpcodeDisplay.innerText = "Last Opcode: " + this.opcode.toString(16);
}

chip8.prototype.toggleDebugMode = function() {
    this.debugMode = !this.debugMode;
    if(!this.debugMode)
    {
        this.registerDisplay.innerText = "";
        this.lastOpcodeDisplay.innerText = "";
    }
}

chip8.prototype.reset = function() {
    this.memory = new Uint8Array(4096);
    this.stack = new Uint16Array(16);
    this.V = new Uint8Array(16);
    this.I = 0;
    this.DT = 0;
    this.ST = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.opcode = 0;
    this.key = new Uint8Array(16);
    this.displayMemory = new Uint8Array(64 * 32);
    this.updateDisplay = false;
    this.rng = new Uint16Array(1);
    this.step = 0;

    this.currentKey = false;
    this.keysMap = { // we map the keyboard to the chip8 keyboard
        49: 0x1, // 1
        50: 0x2, // 2
        51: 0x3, // 3
        52: 0xC, // 4
        81: 0x4, // Q
        87: 0x5, // W
        69: 0x6, // E
        82: 0xD, // R
        65: 0x7, // A
        83: 0x8, // S
        68: 0x9, // D
        70: 0xE, // F
        90: 0xA, // Z
        88: 0x0, // X
        67: 0xB, // C
        86: 0xF  // V
    };

    var fontSet = [ 
        0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
        0x20, 0x60, 0x20, 0x20, 0x70, // 1
        0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
        0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
        0x90, 0x90, 0xF0, 0x10, 0x10, // 4
        0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
        0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
        0xF0, 0x10, 0x20, 0x40, 0x40, // 7
        0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
        0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
        0xF0, 0x90, 0xF0, 0x90, 0x90, // A
        0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
        0xF0, 0x80, 0x80, 0x80, 0xF0, // C
        0xE0, 0x90, 0x90, 0x90, 0xE0, // D
        0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
        0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];

    for(var i = 0; i < fontSet.length; i++)
        this.memory[i] = fontSet[i];

    this.opcodeTable = [
        function(chip8, x, y) { //0x0
            switch(chip8.opcode & 0x00FF) {
                case 0xE0:
                    for(var i = 0; i < chip8.displayMemory.length; i++)
                        chip8.displayMemory[i] = 0;
                    chip8.updateDisplay = true;
                    break;
                case 0xEE:
                    chip8.PC = chip8.stack[chip8.SP];
                    chip8.SP--;
                    break;
                default:
                    console.log("Unknown opcode: " + chip8.opcode.toString(16));
                    break;
            }
        },
        function(chip8, x, y) { //0x1
            chip8.PC = (chip8.opcode & 0x0FFF);
        },
        function(chip8, x, y) { //0x2
            chip8.SP++;
            chip8.stack[chip8.SP] = chip8.PC;
            chip8.PC = (chip8.opcode & 0x0FFF);
        },
        function(chip8, x, y) { //0x3
            if(chip8.V[x] == (chip8.opcode & 0x00FF))
                chip8.PC += 2;
        },
        function(chip8, x, y) { //0x4
            if(chip8.V[x] != (chip8.opcode & 0x00FF))
                chip8.PC += 2;
        },
        function(chip8, x, y) { //0x5
            if(chip8.V[x] == chip8.V[y])
                chip8.PC += 2;
        },
        function(chip8, x, y) { //0x6
            chip8.V[x] = (chip8.opcode & 0x00FF);
        },
        function(chip8, x, y) { //0x7
            chip8.V[x] += (chip8.opcode & 0x00FF);
        },
        function(chip8, x, y) { //0x8
            switch(chip8.opcode & 0x000F) {
                case 0x0:
                    chip8.V[x] = chip8.V[y];
                    break;
                case 0x1:
                    chip8.V[x] |= chip8.V[y];
                    break;
                case 0x2:
                    chip8.V[x] &= chip8.V[y];
                    break;
                case 0x3:
                    chip8.V[x] ^= chip8.V[y];
                    break;
                case 0x4:
                    chip8.V[0xF] = (chip8.V[x] + chip8.V[y] > 255) ? 1 : 0;
                    chip8.V[x] += chip8.V[y];
                    break;
                case 0x5:
                    chip8.V[0xF] = (chip8.V[x] > chip8.V[y]) ? 1 : 0;
                    chip8.V[x] -= chip8.V[y];
                    break;
                case 0x6:
                    chip8.V[0xF] = chip8.V[x] & 0x1;
                    chip8.V[x] >>= 1;
                    break;
                case 0x7:
                    chip8.V[0xF] = (chip8.V[y] > chip8.V[x]) ? 1 : 0;
                    chip8.V[x] = chip8.V[y] - chip8.V[x];
                    break;
                case 0xE:
                    chip8.V[0xF] = (chip8.V[x] & 0x80) >> 7;
                    chip8.V[x] <<= 1;
                    break;
                default:
                    console.log("Unknown opcode: " + chip8.opcode.toString(16));
                    break;
            }
        },
        function(chip8, x, y) { //0x9
            if(chip8.V[x] != chip8.V[y])
                chip8.PC += 2;
        },
        function(chip8, x, y) { //0xA
            chip8.I = (chip8.opcode & 0x0FFF);
        },
        function(chip8, x, y) { //0xB
            chip8.PC = (chip8.opcode & 0x0FFF) + chip8.V[0];
        },
        function(chip8, x, y) { //0xC
            chip8.V[x] = (Math.random() * 0xFF) & (chip8.opcode & 0x00FF);
        },
        function(chip8, x, y) { //0xD
            var height = chip8.opcode & 0x000F;
            var pixel;

            chip8.V[0xF] = 0;
            for(var yline = 0; yline < height; yline++) {
                pixel = chip8.memory[chip8.I + yline];
                for(var xline = 0; xline < 8; xline++) {
                    if((pixel & (0x80 >> xline)) != 0) {
                        if(chip8.displayMemory[(chip8.V[x] + xline + ((chip8.V[y] + yline) * 64))] == 1)
                            chip8.V[0xF] = 1;
                        chip8.displayMemory[chip8.V[x] + xline + ((chip8.V[y] + yline) * 64)] ^= 1;
                    }
                }
            }
            chip8.updateDisplay = true;
        },
        function(chip8, x, y) { //0xE
            switch(chip8.opcode & 0x00FF) {
                case 0x9E:
                    if(chip8.key[chip8.V[x]] != 0)
                        chip8.PC += 2;
                    break;
                case 0xA1:
                    if(chip8.key[chip8.V[x]] == 0)
                        chip8.PC += 2;
                    break;
                default:
                    console.log("Unknown opcode: " + chip8.opcode.toString(16));
                    break;
            }
        },
        function(chip8, x, y) { //0xF
            switch(chip8.opcode & 0x00FF) {
                case 0x07:
                    chip8.V[x] = chip8.DT;
                    break;
                case 0x0A:
                    chip8.currentKey = null;
                    for(var i = 0; i < chip8.key.length; i++) {
                        if(chip8.key[i] == 1) {
                            chip8.V[x] = i;
                            chip8.currentKey = i;
                        }
                    }
                    if(chip8.currentKey == null) {
                        chip8.PC -= 2;
                        return;
                    }
                    break;
                case 0x15:
                    chip8.DT = chip8.V[x];
                    break;
                case 0x18:
                    chip8.ST = chip8.V[x];
                    break;
                case 0x1E:
                    chip8.I += chip8.V[x];
                    break;
                case 0x29:
                    chip8.I = chip8.V[x] * 5;
                    break;
                case 0x33:
                    chip8.memory[chip8.I] = chip8.V[x] / 100;
                    chip8.memory[chip8.I + 1] = (chip8.V[x] / 10) % 10;
                    chip8.memory[chip8.I + 2] = (chip8.V[x] % 100) % 10;
                    break;
                case 0x55:
                    for(var i = 0; i <= x; i++)
                        chip8.memory[chip8.I + i] = chip8.V[i];
                    break;
                case 0x65:
                    for(var i = 0; i <= x; i++)
                        chip8.V[i] = chip8.memory[chip8.I + i];
                    break;
                default:
                    console.log("Unknown opcode: " + chip8.opcode.toString(16));
                    break;
            }
        }
    ];
}

chip8.prototype.loadProgram = function(program) {
    this.reset();
    for(var i = 0; i < program.length; i++)
        this.memory[i + 0x200] = program[i];

    if(this.isRunning) return;
    this.isRunning = true;
    this.runCycle();
}

chip8.prototype.updateTimers = function() {
    if(this.ST > 0) this.ST--;
    if(this.DT > 0) this.DT--;
}

chip8.prototype.executeOpcode = function() {
    var currentPc = this.PC;
    this.opcode = this.memory[currentPc] << 8 | this.memory[currentPc + 1];
    this.PC += 2;

    var x = (this.opcode & 0x0F00) >> 8;
    var y = (this.opcode & 0x00F0) >> 4;

    //console.log(this.opcode.toString(16));
    
    this.opcodeTable[(this.opcode & 0xF000) >> 12](this, x, y);
}

chip8.prototype.stop = function() {
    this.isRunning = false;
}

chip8.prototype.runCycle = function() {
    if(!(this.isRunning)) return;

    this.executeOpcode();
    this.updateTimers();
    this.step++; // increment step
    if(this.step % 2 == 0)
        this.updateTimers();

    if(this.updateDisplay) {
        this.screenContext.fillStyle = "#000000";
        this.screenContext.fillRect(0, 0, this.screenWidth * this.pixelScale, this.screenHeight * this.pixelScale);
        this.screenContext.fillStyle = "#FFFFFF";
        for(var i = 0; i < this.displayMemory.length; i++) {
            if(this.displayMemory[i] == 1)
                this.screenContext.fillRect((i % 64) * this.pixelScale, Math.floor(i / 64) * this.pixelScale, this.pixelScale, this.pixelScale);
        }
        this.updateDisplay = false;
    }

    this.updateDebugDisplay();
	setTimeout(this.runCycle.bind(this), 10); // run the cycle again
}