//https://www.youtube.com/watch?v=kWQ84S13-hw
const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec; //libreria que nos permite generar claves privadas y publicas
const ec = new EC('secp256k1'); //algoritmo que tiene como base las billeteras del Bitcoin

class Transaction {
    constructor(fromAddress, toAddress, amount) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.timestamp = Date.now();
    }

    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    }

    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('¡No puedes firmar la transacción para otras billeteras!');
        }

        const hashTx = this.calculateHash();
        const sig = signingKey.sign(hashTx, 'base64');
        this.signature = sig.toDER('hex');
    }

    isValid() {
        //verificamos que no sea null (si es null es porque es una recompensa y es valida)
        if (this.fromAddress === null) return true;

        //verificamos que tenga una firma
        if (!this.signature || this.signature.length === 0) {
            throw new Error('Sin firma en esta transacción');
        }

        //extraemos la clave publica
        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        //verificamos que esta transaccion haya sido firmada efectivamente por esa clave
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions; //un bloque acepta multiples transacciones
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return SHA256(this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
    }

    mineBLock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }

        console.log("Bloque minado: " + this.hash);
    }

    //verificar todas las trasacciones en el bloque actual
    hasValidTransaction() {
        //iterar sobre todas las transacciones del bloque
        for (const tx of this.transactions) {
            //validamos que cada trasnsccion sea valida
            if (!tx.isValid()) {
                return false;
            }
        }

        return true;
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 2; //Dificultad que se agrega a mano, esto se refleja en el hash creado al ver 2 ceros adelante.
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    createGenesisBlock() {
        return new Block("04/12/2019", [], "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.mineBLock(this.difficulty);

        console.log('¡Bloque minado correctamente!');
        this.chain.push(block);

        this.pendingTransactions = [

        ];
    }

    addTransaction(transaction) {
        //verificar que la direccion origen y destino este completa
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('La transacción debe incluir una direccion desde y hacia');
        }

        //Validamos que la transaccion sea valida
        if (!transaction.isValid()) {
            throw new Error('No se puede agregar una transacción no válida a la cadena');
        }

        //Lo agregamos al listado de transascciones pendientes
        this.pendingTransactions.push(transaction);
    }

    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.transactions) {
                if (trans.fromAddress === address) {
                    balance -= trans.amount;
                }
                if (trans.toAddress === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            //verificamos que cada transaccion dentro del bloque sea valida
            if (!currentBlock.hasValidTransaction()) {
                return false;
            }

            //verificamos la validez de cada bloque
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false
            }

            //verificamos la validez de cada bloque
            if (currentBlock.previousHash !== previousBlock.calculateHash()) {
                return false;
            }
        }

        return true;
    }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;