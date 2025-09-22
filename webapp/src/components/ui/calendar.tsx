import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css";
import { enUS, he, ar } from "react-day-picker/locale";
import { useTranslation } from 'react-i18next'
import { useIsRtl } from "@/hooks/useIsRtl"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const { i18n } = useTranslation()
  const isRtl = useIsRtl()

  // Map language codes to locales
  const localeMap = {
    'en': enUS,
    'he': he,
    'ar': ar
  }

  // Get the current locale based on the language
  const currentLocale = localeMap[i18n.language as keyof typeof localeMap] || enUS

  return (
    <DayPicker
      dir={isRtl ? "rtl" : "ltr"}
      locale={currentLocale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        button_next: "[&_*]:fill-black",
        button_previous: "[&_*]:fill-black",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }