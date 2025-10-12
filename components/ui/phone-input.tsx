"use client";

import React from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export { isValidPhoneNumber } from "libphonenumber-js";

interface PhoneInputProps {
  value?: E164Number | string;
  onChange?: (value?: E164Number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Componente stabile definito fuori per evitare ricreazione ad ogni render
const StyledPhoneNumberInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    {...props}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "md:text-sm"
    )}
  />
));

StyledPhoneNumberInput.displayName = "StyledPhoneNumberInput";

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, placeholder, disabled, className }, ref) => {
    const handleChange = (newValue?: E164Number) => {
      onChange?.(newValue);
    };
    
    return (
      <PhoneInputWithCountry
        international
        defaultCountry="IT"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "phone-input-wrapper",
          className
        )}
        inputComponent={StyledPhoneNumberInput}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
