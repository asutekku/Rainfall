import * as React from "react";

export const CharacterPortrait = (props: { imgSource: string }) => (
    <div className={"charPortraitContainer"}>
        <img src={props.imgSource} className={'charPortrait'} alt={'Character portrait'}/>
    </div>);
