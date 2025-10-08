export const heTranslation = {
  ai: {
    actionsCompleted: 'הפעולות הושלמו בהצלחה',
    noActionsTaken: 'לא בוצעו פעולות',
    confirmAction: 'האם אתה בטוח שברצונך לבצע פעולה זו?',
    confirmDelete: 'האם אתה בטוח שברצונך למחוק {{resource}}?',
    confirmRemove: 'האם אתה בטוח שברצונך להסיר {{resource}}?',
    unsupportedToolType: 'סוג קריאת כלי לא נתמך',
    unknownTool: 'כלי לא ידוע: {{toolName}}',
    failedToExecute: 'נכשל בביצוע {{toolName}}',
  },
  serviceCategories: {
    photography: {
      name: "צילום",
      description: "שירותי צילום מקצועיים"
    },
    catering: {
      name: "קייטרינג",
      description: "שירותי מזון ומשקאות"
    },
    music: {
      name: "מוזיקה",
      description: "שירותי מוזיקה ובידור"
    },
    decoration: {
      name: "עיצוב",
      description: "עיצוב וקישוט אירועים"
    },
    venue: {
      name: "אולם",
      description: "שירותי אולמות ומקומות אירועים"
    },
    flowers: {
      name: "פרחים",
      description: "סידורי פרחים ועיצובים"
    },
    transportation: {
      name: "הסעות",
      description: "שירותי הסעות ולוגיסטיקה"
    },
    coordination: {
      name: "הפקה",
      description: "תכנון והפקת אירועים"
    },
    security: {
      name: "אבטחה",
      description: "שירותי אבטחה ובטיחות"
    },
    lighting: {
      name: "תאורה",
      description: "שירותי תאורה והגברה"
    },
    videography: {
      name: "צילום וידאו",
      description: "שירותי צילום וידאו מקצועיים"
    },
    makeup: {
      name: "איפור ושיער",
      description: "שירותי איפור ועיצוב שיער"
    },
    rental: {
      name: "השכרות",
      description: "השכרת ציוד וריהוט"
    },
    printing: {
      name: "הדפסות",
      description: "שירותי הדפסה והזמנות"
    },
    other: {
      name: "אחר",
      description: "שירותים שונים נוספים"
    }
  },
  organization: {
    defaultName: "הארגון של {{userName}}",
    defaultNameFromEmail: "הארגון של {{emailPrefix}}"
  }
} as const