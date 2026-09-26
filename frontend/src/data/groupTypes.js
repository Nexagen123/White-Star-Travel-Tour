export const groupTypes = [
  {
    label: "All Groups",
    value: "",
    path: "dashboard/groups",
    ownGroupType: "",
  },
  {
    label: "Umrah Packages",
    value: "Umrah Packages",
    path: "all-groups",
    ownGroupType: "Umrah Groups",
  },
  {
    label: "Umrah Groups (Only Seats)",
    value: "UMRAH GROUP",
    path: "dashboard/groups?group_type=UMRAH GROUP",
    ownGroupType: "Umrah Groups",
  },
  {
    label: "UAE (United Arab Emirates)",
    value: "UAE ONE WAY GROUP",
    path: "dashboard/groups?group_type=UAE ONE WAY GROUP",
    ownGroupType: "UAE Groups",
  },
  {
    label: "KSA (Saudia Arabia) one way",
    value: "ONE WAY GROUP",
    path: "dashboard/groups?group_type=ONE WAY GROUP",
    ownGroupType: "KSA Groups",
  },
  {
    label: "Kuwait (KWI)",
    value: "OMAN ONE WAY GROUP",
    path: "dashboard/groups?group_type=OMAN ONE WAY GROUP",
    ownGroupType: "Mascat Groups",
  },
];
