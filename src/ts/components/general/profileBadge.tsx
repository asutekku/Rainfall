import * as React from "react";
import {Actor} from "../../actors/Actor";
import {PROFILE, Profile, profileOf, profileTitle} from "../../interact/profile";

/**
 * The one badge, used everywhere a body is listed.
 *
 * Deliberately a single component rather than a glyph copied into six screens:
 * the whole value of the profile is that the player learns to read three icons,
 * and three icons only teach anything if they are identical on the hire board,
 * the staging screen, the battle HUD and the unit card. Colour carries the
 * category, the glyph carries it again for anyone who cannot use the colour,
 * and the tooltip carries what to actually do about it.
 */

export interface ProfileBadgeProps {
    /** The unit to read. Live state, so it updates as a fight wears them down. */
    unit: Actor;
    /** Print the word beside the icon (roomier screens: staging, the card). */
    withLabel?: boolean | undefined;
}

export class ProfileBadge extends React.Component<ProfileBadgeProps, {}> {
    public override render() {
        const p = profileOf(this.props.unit);
        return <ProfileChip profile={p} withLabel={this.props.withLabel}
                            title={profileTitle(this.props.unit)}/>;
    }
}

export interface ProfileChipProps {
    profile: Profile;
    withLabel?: boolean | undefined;
    title?: string | undefined;
}

/**
 * The same chip driven by a bare profile, for the places that do not have an
 * Actor to hand — the hire board reads a `MercOffer`, and the staging summary
 * counts a wave rather than pointing at one body.
 */
export class ProfileChip extends React.Component<ProfileChipProps, {}> {
    public override render() {
        const spec = PROFILE[this.props.profile];
        const title = this.props.title
            || `${spec.label} — ${spec.blurb}. Bring: ${spec.counter}.`;
        return (
            <span className={"prof pr-" + this.props.profile} title={title}>
                <i>{spec.glyph}</i>
                {this.props.withLabel && <b>{spec.label}</b>}
            </span>);
    }
}
