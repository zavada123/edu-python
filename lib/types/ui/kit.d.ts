import type { MouseEventHandler, ReactNode } from "react";
/** Joins class names; `false`, `null` and `""` are left out. */
export declare const cn: (...names: ReadonlyArray<string | false | null>) => string;
export declare const ButtonVariants: {
    readonly Primary: "primary";
    readonly Outline: "outline";
    readonly Ghost: "ghost";
    readonly Danger: "danger";
};
export type ButtonVariant = (typeof ButtonVariants)[keyof typeof ButtonVariants];
export declare const ButtonSizes: {
    readonly Sm: "sm";
    readonly Md: "md";
};
export type ButtonSize = (typeof ButtonSizes)[keyof typeof ButtonSizes];
export declare function Button(props: Readonly<{
    variant: ButtonVariant;
    size: ButtonSize;
    disabled: boolean;
    onClick: MouseEventHandler<HTMLButtonElement>;
    children: ReactNode;
}>): import("react").JSX.Element;
export declare const AlertTones: {
    readonly Info: "info";
    readonly Warning: "warning";
    readonly Error: "error";
};
export type AlertTone = (typeof AlertTones)[keyof typeof AlertTones];
export declare function Alert(props: Readonly<{
    tone: AlertTone;
    children: ReactNode;
}>): import("react").JSX.Element;
