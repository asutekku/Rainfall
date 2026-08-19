import * as React from "react";

/**
 * The keyed-grid kit — the one set of controls every menu screen builds from.
 *
 * One component per shape so the title, the creator, staging and options stop
 * hand-rolling the same button four ways: a keyed row, the key bar along the
 * foot, the back button that lives in it, and a modal for choices too big for
 * a table cell. Visual language is the game's original console chrome (the
 * bevel, the rust accent, the panel ground — see .redBtn), sized to Apple's
 * 44pt touch floor below the breakpoint.
 */

export interface KgRowProps {
    /** A keyboard key printed in a box. Hidden on touch — it means nothing there. */
    hotkey?: string | undefined;
    /** A state glyph printed in the same box. Always shown — it carries information. */
    glyph?: string | undefined;
    label: React.ReactNode;
    /** Right-hand side: a value, a hint, or nothing. */
    value?: React.ReactNode;
    /** Custom right-hand content (a dial, chips) — wins over `value`. */
    right?: React.ReactNode;
    on?: boolean | undefined;
    danger?: boolean | undefined;
    disabled?: boolean | undefined;
    title?: string | undefined;
    labelStyle?: React.CSSProperties | undefined;
    onClick?: (() => void) | undefined;
}

export function KgRow(props: KgRowProps) {
    const cls = "kgRow" + (props.on ? " on" : "") + (props.danger ? " dgr" : "");
    return (
        <button className={cls} disabled={props.disabled} title={props.title} onClick={props.onClick}>
            {props.hotkey !== undefined && <span className={"kgKey kb"}>{props.hotkey}</span>}
            {props.glyph !== undefined && <span className={"kgKey"}>{props.glyph}</span>}
            <b style={props.labelStyle}>{props.label}</b>
            {props.right !== undefined ? props.right
                : props.value !== undefined ? <i>{props.value}</i> : null}
        </button>);
}

/** The key bar along the foot. Children lay out left to right; use kgBar CSS classes. */
export function KgBar(props: {children: React.ReactNode}) {
    return <div className={"kgBar"}>{props.children}</div>;
}

/** The way out, as a button — esc has no key on a phone. */
export function KgBack(props: {label?: string; onClick: () => void}) {
    return <button className={"kgBack r"} onClick={props.onClick}>← {props.label || "Back"}</button>;
}

export interface KgModalProps {
    title: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * A choice too big for a table cell. Bottom sheet on a phone, centred card on
 * a desktop; the scrim and the ✕ both close it, and so does Escape (the
 * opener's own key handler keeps running — guard on the modal being open).
 */
export function KgModal(props: KgModalProps) {
    return (
        <div className={"kgScrim"} onClick={props.onClose}>
            <div className={"kgSheet"} onClick={(e) => e.stopPropagation()}>
                <div className={"kgSheetHead"}>
                    <h3 className={"kgH"}>{props.title}</h3>
                    <button className={"kgSheetX"} onClick={props.onClose}>✕</button>
                </div>
                {props.children}
            </div>
        </div>);
}
