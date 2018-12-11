import * as React from "react";

export interface MenuButtonProps {
    text: string;
    update: any;
    active: string;
    message?: string;
    getMessage?: any;
}


export interface MenuButtonState {
    message?: string;
}

export class MenuButton extends React.Component<MenuButtonProps, MenuButtonState> {

    constructor(props: any) {
        super(props);
        if (this.props.message) this.state = {message: this.props.message};
    }

    render() {
        return (
            <button className={this.props.active == this.props.text ? 'button buttonActiveSelection' : 'button'}
                    type="button"
                    onClick={() => {
                        if (this.props.message) this.props.getMessage(this.state.message);
                        this.props.update(this.props.text);
                    }}>
                {this.props.text}
            </button>)
    }
}