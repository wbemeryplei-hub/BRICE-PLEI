/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryData {
  id: string;
  country: string;
  formerNetwork: string;
  currentNetwork: string;
  itrf: string;
  epoch: string;
  status: 'COMPLETE' | 'NO_EPOCH' | 'MISSING_INFO' | 'ACTIVE' | 'LOCAL_NETWORK';
  zone: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTER';
}

export interface TableHeaders {
  country: string;
  formerNetwork: string;
  currentNetwork: string;
  itrf: string;
  epoch: string;
  status: string;
}

export const AFRICA_DATA: CountryData[] = [

  { id: "ZAF", country: "South Africa", formerNetwork: "Cape Datum", currentNetwork: "Hartebeesthoek94 Datum", itrf: "ITRF 2014", epoch: "2018.18", status: "COMPLETE", zone: "SOUTH" },

  { id: "DZA", country: "Algeria", formerNetwork: "North Sahara Geodetic System 1959", currentNetwork: "Atlas Geodetic Network (REGAT)", itrf: "ITRF 2014", epoch: "2010", status: "COMPLETE", zone: "NORTH" },

  { id: "AGO", country: "Angola", formerNetwork: "", currentNetwork: "RGNA (Active National Geodetic Network)", itrf: "ITRF 2008", epoch: "2010", status: "COMPLETE", zone: "SOUTH" },

  { id: "BEN", country: "Benin", formerNetwork: "RGB ITRF 1993 @95.9", currentNetwork: "RSPB CORS", itrf: "ITRF 2000", epoch: "1997", status: "COMPLETE", zone: "WEST" },

  { id: "BWA", country: "Botswana", formerNetwork: "BTRS (Botswana Terrestrial Reference Sys", currentNetwork: "BNGRS02 (Botswana National Geodetic Reference System 2002)", itrf: "ITRF 2000", epoch: "2002", status: "COMPLETE", zone: "SOUTH" },

  { id: "BFA", country: "Burkina Faso", formerNetwork: "adindan point 58", currentNetwork: "BF-CORS", itrf: "ITRF 2008", epoch: "2011.7205", status: "COMPLETE", zone: "WEST" },

  { id: "BDI", country: "Burundi", formerNetwork: "Arc 1960", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "EAST" },

  { id: "CMR", country: "Cameroon", formerNetwork: "", currentNetwork: "National Geodetic Network (RGC11)", itrf: "ITRF 2008", epoch: "2011.5", status: "COMPLETE", zone: "CENTER" },

  { id: "CPV", country: "Cape Verde", formerNetwork: "CVRS96 ITRF 1996", currentNetwork: "Fundamental Geodetic Network of Cape Verde (RGFCV)", itrf: "ITRF 1996", epoch: "1996", status: "COMPLETE", zone: "WEST" },

  { id: "COM", country: "Comoros", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "NO_EPOCH", zone: "EAST" },

  { id: "COG", country: "Congo-Brazzaville", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "NO_EPOCH", zone: "CENTER" },

  { id: "CIV", country: "Ivory Coast", formerNetwork: "RGCI 1996@1998.2", currentNetwork: "RGCI 2022", itrf: "ITRF 2014", epoch: "2010", status: "COMPLETE", zone: "WEST" },

  { id: "DJI", country: "Djibouti", formerNetwork: "Ghoubbet-Asal (IGN 1973)", currentNetwork: "Djibouti Geodetic Network", itrf: "ITRF 2005", epoch: "2012.27", status: "COMPLETE", zone: "EAST" },

  { id: "EGY", country: "Egypt", formerNetwork: "EGN 80", currentNetwork: "NED95 (National Egyptian Datum 1995)", itrf: "ITRF 1993", epoch: "1998.1", status: "COMPLETE", zone: "NORTH" },

  { id: "ERI", country: "Eritrea", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "ITRF", status: "NO_EPOCH", zone: "EAST" },

  { id: "SWZ", country: "Eswatini", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "ITRF", status: "NO_EPOCH", zone: "SOUTH" },

  { id: "ETH", country: "Ethiopia", formerNetwork: "", currentNetwork: "National Geodetic Network", itrf: "ITRF 2005", epoch: "2000", status: "COMPLETE", zone: "EAST" },

  { id: "GAB", country: "Gabon", formerNetwork: "", currentNetwork: "", itrf: "WGS 84", epoch: "", status: "LOCAL_NETWORK", zone: "CENTER" },

  { id: "GMB", country: "Gambia", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "WEST" },

  { id: "GHA", country: "Ghana", formerNetwork: "Accra Datum (1926)", currentNetwork: "Geodetic Reference Network (GRN)", itrf: "ITRF 2005", epoch: "2007.39", status: "COMPLETE", zone: "WEST" },

  { id: "GIN", country: "Guinea", formerNetwork: "Conakry Datum (1905)", currentNetwork: "Réseau géodésique de Conakry", itrf: "ITRF 2008", epoch: "2011", status: "COMPLETE", zone: "WEST" },

  { id: "GNQ", country: "Equatorial Guinea", formerNetwork: "", currentNetwork: "", itrf: "WGS 84", epoch: "", status: "LOCAL_NETWORK", zone: "CENTER" },

  { id: "GNB", country: "Guinea-Bissau", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "WEST" },

  { id: "KEN", country: "Kenya", formerNetwork: "Kenya Absolute Reference System KARS96", currentNetwork: "KENREF (Kenya Geodetic Reference Frame)", itrf: "ITRF 2014", epoch: "2015", status: "COMPLETE", zone: "EAST" },

  { id: "LSO", country: "Lesotho", formerNetwork: "", currentNetwork: "", itrf: "ITRF", epoch: "", status: "NO_EPOCH", zone: "SOUTH" },

  { id: "LBR", country: "Liberia", formerNetwork: "", currentNetwork: "Liberia Geodetic Reference frame (LGR)", itrf: "ITRF", epoch: "", status: "NO_EPOCH", zone: "WEST" },

  { id: "LBY", country: "Libya", formerNetwork: "", currentNetwork: "LGD2006(Libyan Geodetic Datum 2006)", itrf: "ITRF 2000", epoch: "2006.3822", status: "COMPLETE", zone: "NORTH" },

  { id: "MDG", country: "Madagascar", formerNetwork: "", currentNetwork: "RGM65", itrf: "ITRF", epoch: "", status: "NO_EPOCH", zone: "EAST" },

  { id: "MWI", country: "Malawi", formerNetwork: "", currentNetwork: "MGRF2005", itrf: "ITRF 2008", epoch: "2005.0", status: "COMPLETE", zone: "SOUTH" },

  { id: "MLI", country: "Mali", formerNetwork: "", currentNetwork: "Mali Reference Geodetic Network (RGRM)", itrf: "WGS 84", epoch: "", status: "LOCAL_NETWORK", zone: "WEST" },

  { id: "MAR", country: "Morocco", formerNetwork: "Merchich Datum", currentNetwork: "RFM", itrf: "ITRF 2000", epoch: "2005.0", status: "COMPLETE", zone: "NORTH" },

  { id: "MUS", country: "Mauritius", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "EAST" },

  { id: "MRT", country: "Mauritania", formerNetwork: "", currentNetwork: "(RGM 2020)", itrf: "ITRF 2020", epoch: "2015", status: "COMPLETE", zone: "NORTH" },

  { id: "MOZ", country: "Mozambique", formerNetwork: "ITRF94", currentNetwork: "MOZNET", itrf: "ITRF 2000", epoch: "1997", status: "COMPLETE", zone: "SOUTH" },

  { id: "NAM", country: "Namibia", formerNetwork: "Schwarzeck datum", currentNetwork: "", itrf: "ITRF 2000/2008", epoch: "2005", status: "COMPLETE", zone: "SOUTH" },

  { id: "NER", country: "Niger", formerNetwork: "", currentNetwork: "", itrf: "WGS 84", epoch: "", status: "LOCAL_NETWORK", zone: "WEST" },

  { id: "NGA", country: "Nigeria", formerNetwork: "Datum MINNA", currentNetwork: "NGD2022/NIGREF22 (Nigerian Geodetic Datum)", itrf: "ITRF 2020", epoch: "2015", status: "COMPLETE", zone: "WEST" },

  { id: "UGA", country: "Uganda", formerNetwork: "(Arc 1960)", currentNetwork: "Uganda Geodetic Reference Framework - UGRF", itrf: "ITRF 2005", epoch: "2010", status: "COMPLETE", zone: "EAST" },

  { id: "COD", country: "DRC", formerNetwork: "", currentNetwork: "southern tier", itrf: "ITRF 2005", epoch: "2000", status: "COMPLETE", zone: "CENTER" },

  { id: "CAF", country: "Central African Republic", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "CENTER" },

  { id: "RWA", country: "Rwanda", formerNetwork: "", currentNetwork: "RGN (Rwanda Geodetic Network)", itrf: "ITRF 2014", epoch: "2000", status: "COMPLETE", zone: "EAST" },

  { id: "ESH", country: "Western Sahara", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "WEST" },

  { id: "STP", country: "Sao Tome and Principe", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "CENTER" },

  { id: "SEN", country: "Senegal", formerNetwork: "ASECNA 1996@98.5", currentNetwork: "RRS04", itrf: "ITRF 2000", epoch: "2004.56", status: "COMPLETE", zone: "WEST" },

  { id: "SYC", country: "Seychelles", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "EAST" },

  { id: "SLE", country: "Sierra Leone", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "WEST" },

  { id: "SOM", country: "Somalia", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "EAST" },

  { id: "SDN", country: "Sudan", formerNetwork: "", currentNetwork: "SRGGS (Sudan Reference GNSS System )", itrf: "ITRF 2008", epoch: "2008", status: "COMPLETE", zone: "NORTH" },

  { id: "SSD", country: "South Sudan", formerNetwork: "", currentNetwork: "", itrf: "", epoch: "", status: "MISSING_INFO", zone: "EAST" },

  { id: "TZA", country: "Tanzania", formerNetwork: "", currentNetwork: "TAREF 11 (Tanzania Reference Frame 2011)", itrf: "ITRF 2014", epoch: "2011.0", status: "COMPLETE", zone: "EAST" },

  { id: "TCD", country: "Chad", formerNetwork: "", currentNetwork: "RGT20 (Réseau Géodésique Tchad 2020", itrf: "ITRF", epoch: "", status: "NO_EPOCH", zone: "CENTER" },

  { id: "TGO", country: "Togo", formerNetwork: "", currentNetwork: "", itrf: "ITRF 2014", epoch: "2010", status: "COMPLETE", zone: "WEST" },

  { id: "TUN", country: "Tunisia", formerNetwork: "CARTHAGE 1988", currentNetwork: "NTT (New Tunisian Triangulation)", itrf: "ITRF 2000", epoch: "2000", status: "COMPLETE", zone: "NORTH" },

  { id: "ZMB", country: "Zambia", formerNetwork: "", currentNetwork: "Zambia Main Network", itrf: "ITRF 2000", epoch: "2005", status: "COMPLETE", zone: "SOUTH" },

  { id: "ZWE", country: "Zimbabwe", formerNetwork: "", currentNetwork: "ZINGSA", itrf: "ITRF 2000", epoch: "", status: "NO_EPOCH", zone: "SOUTH" }

];
