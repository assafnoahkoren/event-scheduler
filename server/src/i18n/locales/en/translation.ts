export const enTranslation = {
  ai: {
    actionsCompleted: 'Actions completed successfully',
    noActionsTaken: 'No actions taken',
    confirmAction: 'Are you sure you want to perform this action?',
    confirmDelete: 'Are you sure you want to delete this {{resource}}?',
    confirmRemove: 'Are you sure you want to remove this {{resource}}?',
    unsupportedToolType: 'Unsupported tool call type',
    unknownTool: 'Unknown tool: {{toolName}}',
    failedToExecute: 'Failed to execute {{toolName}}',
  },
  serviceCategories: {
    photography: {
      name: "Photography",
      description: "Professional photography services"
    },
    catering: {
      name: "Catering",
      description: "Food and beverage services"
    },
    music: {
      name: "Music",
      description: "Music and entertainment services"
    },
    decoration: {
      name: "Decoration",
      description: "Event decoration and design"
    },
    venue: {
      name: "Venue",
      description: "Event venue and location services"
    },
    flowers: {
      name: "Flowers",
      description: "Floral arrangements and designs"
    },
    transportation: {
      name: "Transportation",
      description: "Transportation and logistics services"
    },
    coordination: {
      name: "Coordination",
      description: "Event planning and coordination"
    },
    security: {
      name: "Security",
      description: "Security and safety services"
    },
    lighting: {
      name: "Lighting",
      description: "Lighting and audio-visual services"
    },
    videography: {
      name: "Videography",
      description: "Professional video recording services"
    },
    makeup: {
      name: "Makeup & Hair",
      description: "Makeup and hair styling services"
    },
    rental: {
      name: "Rentals",
      description: "Equipment and furniture rentals"
    },
    printing: {
      name: "Printing",
      description: "Printing and invitation services"
    },
    other: {
      name: "Other",
      description: "Other miscellaneous services"
    }
  },
  organization: {
    defaultName: "{{userName}}'s Organization",
    defaultNameFromEmail: "{{emailPrefix}}'s Organization"
  }
} as const