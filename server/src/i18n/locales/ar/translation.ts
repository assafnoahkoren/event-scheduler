export const arTranslation = {
  ai: {
    actionsCompleted: 'تم إكمال الإجراءات بنجاح',
    noActionsTaken: 'لم يتم اتخاذ أي إجراءات',
    confirmAction: 'هل أنت متأكد أنك تريد تنفيذ هذا الإجراء؟',
    confirmDelete: 'هل أنت متأكد أنك تريد حذف {{resource}}؟',
    confirmRemove: 'هل أنت متأكد أنك تريد إزالة {{resource}}؟',
    unsupportedToolType: 'نوع استدعاء الأداة غير مدعوم',
    unknownTool: 'أداة غير معروفة: {{toolName}}',
    failedToExecute: 'فشل في تنفيذ {{toolName}}',
  },
  serviceCategories: {
    photography: {
      name: "التصوير",
      description: "خدمات التصوير المحترف"
    },
    catering: {
      name: "الضيافة",
      description: "خدمات الأطعمة والمشروبات"
    },
    music: {
      name: "الموسيقى",
      description: "خدمات الموسيقى والترفيه"
    },
    decoration: {
      name: "الديكور",
      description: "تصميم وديكور الحفلات"
    },
    venue: {
      name: "القاعة",
      description: "خدمات قاعات الحفلات والمواقع"
    },
    flowers: {
      name: "الزهور",
      description: "تنسيق وتصميم الزهور"
    },
    transportation: {
      name: "النقل",
      description: "خدمات النقل واللوجستيات"
    },
    coordination: {
      name: "التنسيق",
      description: "تخطيط وتنسيق الفعاليات"
    },
    security: {
      name: "الأمن",
      description: "خدمات الأمن والسلامة"
    },
    lighting: {
      name: "الإضاءة",
      description: "خدمات الإضاءة والصوتيات"
    },
    videography: {
      name: "تصوير الفيديو",
      description: "خدمات تصوير الفيديو المحترف"
    },
    makeup: {
      name: "المكياج والشعر",
      description: "خدمات المكياج وتصفيف الشعر"
    },
    rental: {
      name: "التأجير",
      description: "تأجير المعدات والأثاث"
    },
    printing: {
      name: "الطباعة",
      description: "خدمات الطباعة والدعوات"
    },
    other: {
      name: "أخرى",
      description: "خدمات متنوعة أخرى"
    }
  },
  organization: {
    defaultName: "منظمة {{userName}}",
    defaultNameFromEmail: "منظمة {{emailPrefix}}"
  }
} as const