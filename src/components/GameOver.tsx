import * as React from 'react';

const GameOver = () => {
    let reload = e => {
        window.location.reload();
    };
    return (
        <div className={'gameOverScreen'}>
            <div className={'gameOver-text'}>
                <h1>Game over</h1>
                <p>All members in your party are dead.</p>
                <button className={'button'} onClick={reload}>Restart</button>
            </div>
        </div>
    );
};

export default GameOver;