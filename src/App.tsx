/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Info, 
  Map as MapIcon, 
  Table as TableIcon, 
  BookOpen, 
  User, 
  Globe,
  X,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Settings,
  ExternalLink,
  MessageSquare,
  Send,
  BarChart3
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { MapContainer, TileLayer, GeoJSON, Tooltip, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AFRICA_DATA, CountryData, TableHeaders } from './data';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AfricaIntro } from './components/AfricaIntro';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ISO3_TO_ISO2: Record<string, string> = {
  'ZAF': 'za', 'DZA': 'dz', 'AGO': 'ao', 'BEN': 'bj', 'BWA': 'bw', 'BFA': 'bf', 'BDI': 'bi', 'CMR': 'cm',
  'CPV': 'cv', 'COM': 'km', 'COG': 'cg', 'CIV': 'ci', 'DJI': 'dj', 'EGY': 'eg', 'ERI': 'er', 'SWZ': 'sz',
  'ETH': 'et', 'GAB': 'ga', 'GMB': 'gm', 'GHA': 'gh', 'GIN': 'gn', 'GNQ': 'gq', 'GNB': 'gw', 'KEN': 'ke',
  'LSO': 'ls', 'LBR': 'lr', 'LBY': 'ly', 'MDG': 'mg', 'MWI': 'mw', 'MLI': 'ml', 'MAR': 'ma', 'MUS': 'mu',
  'MRT': 'mr', 'MOZ': 'mz', 'NAM': 'na', 'NER': 'ne', 'NGA': 'ng', 'UGA': 'ug', 'COD': 'cd', 'CAF': 'cf',
  'RWA': 'rw', 'ESH': 'eh', 'STP': 'st', 'SEN': 'sn', 'SYC': 'sc', 'SLE': 'sl', 'SOM': 'so', 'SDN': 'sd',
  'SSD': 'ss', 'TZA': 'tz', 'TCD': 'td', 'TGO': 'tg', 'TUN': 'tn', 'ZMB': 'zm', 'ZWE': 'zw'
};

const getFlagUrl = (iso3: string) => {
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return null;
  return `https://flagcdn.com/w40/${iso2}.png`;
};

const getEmojiFlag = (iso3: string) => {
  const iso2 = ISO3_TO_ISO2[iso3.toUpperCase()];
  if (!iso2) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => c.charCodeAt(0) + 127397));
};

/// Map Component
const AfricaMap = ({ 
  onCountryClick, 
  selectedCountryId,
  data,
  headers,
  setEditingHeaders,
  setIsHeaderModalOpen,
  statusColors,
  setStatusColors,
  mapRef,
  africanGeoData
}: { 
  onCountryClick: (country: CountryData | null) => void;
  selectedCountryId: string | null;
  data: CountryData[];
  headers: TableHeaders;
  setEditingHeaders: (headers: TableHeaders) => void;
  setIsHeaderModalOpen: (open: boolean) => void;
  statusColors: Record<string, string>;
  setStatusColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  mapRef: React.MutableRefObject<L.Map | null>;
  africanGeoData: any;
}) => {
  const getStyle = (feature: any) => {
    const id = feature.id;
    const country = data.find(c => c.id === id);
    const isSelected = selectedCountryId === id;
    
    let fillColor = '#f1f5f9';
    if (country) {
      fillColor = statusColors[country.status] || '#f1f5f9';
    }

    return {
      fillColor,
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#ef4444' : 'white',
      fillOpacity: country ? 0.7 : 0.3,
      dashArray: isSelected ? '3' : ''
    };
  };

  const MapInstanceCollector = () => {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  };

  const MapBoundsController = () => {
    const map = useMap();
    useEffect(() => {
      if (!africanGeoData) return;
      // Only fit to continent on load or reset
      const bounds = L.geoJSON(africanGeoData).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [10, 10] });
      }
    }, [africanGeoData, map]);
    return null;
  };

  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      click: (e: any) => {
        L.DomEvent.stopPropagation(e);
        const country = data.find(c => c.id === feature.id);
        onCountryClick(country || null);
      }
    });

    const country = data.find(c => c.id === feature.id);
    if (country) {
      layer.bindTooltip(`${country.country}`, {
        permanent: true,
        direction: 'center',
        className: 'custom-tooltip'
      });
    }
  };

  const manualIslands = [
    { id: 'MUS', name: 'Mauritius', coords: [-20.3484, 57.5522] as [number, number] },
    { id: 'SYC', name: 'Seychelles', coords: [-4.6796, 55.4920] as [number, number] },
    { id: 'COM', name: 'Comoros', coords: [-11.6450, 43.3333] as [number, number] },
    { id: 'CPV', name: 'Cape Verde', coords: [16.0020, -23.0418] as [number, number] },
    { id: 'STP', name: 'Sao Tome and Principe', coords: [0.1864, 6.7333] as [number, number] }
  ];

  const handleColorChange = (status: string, color: string) => {
    setStatusColors(prev => ({ ...prev, [status]: color }));
  };

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      <div className="py-2 px-4 border-b border-slate-100 bg-slate-50/50 flex justify-center items-center">
        <h2 className="text-[9px] sm:text-[11px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] text-center">
          CARTOGRAPHY OF REFERENCE SYSTEMS IN AFRICA
        </h2>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        <MapContainer 
          center={[1, 18]} 
          zoom={3} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapBoundsController />
          <MapInstanceCollector />
          {africanGeoData && (
            <GeoJSON 
              key={JSON.stringify(selectedCountryId) + JSON.stringify(statusColors)}
              data={africanGeoData} 
              style={getStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {manualIslands.map(island => {
            const country = data.find(c => c.id === island.id);
            if (!country) return null;
            
            const color = statusColors[country.status] || '#f1f5f9';

            return (
              <Marker 
                key={island.id + JSON.stringify(statusColors)} 
                position={island.coords}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [10, 10],
                  iconAnchor: [5, 5]
                })}
                eventHandlers={{
                  click: () => onCountryClick(country)
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -5]} className="custom-tooltip">
                  {island.name}
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Statistics and Legend can remain as overlays */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 text-[8px] sm:text-[10px] text-slate-700 shadow-lg min-w-[120px] sm:min-w-[180px] pointer-events-auto"
        >
          <div className="font-black mb-1 sm:mb-1.5 text-indigo-900 uppercase tracking-wider border-b border-indigo-100 pb-1">
            Statistics
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-slate-50">
              {[
                { label: 'ITRF with Epoch', status: 'COMPLETE' },
                { label: 'ITRF without Epoch', status: 'NO_EPOCH' },
                { label: 'Missing Info', status: 'MISSING_INFO' },
                { label: 'Local Network', status: 'LOCAL_NETWORK' }
              ].map((item) => {
                const count = data.filter(c => c.status === item.status).length;
                const percentage = data.length > 0 ? ((count / data.length) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={item.status} className="group">
                    <td className="py-0.5 sm:py-1 flex items-center gap-1 sm:gap-1.5">
                      <div 
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm" 
                        style={{ backgroundColor: statusColors[item.status] }} 
                      />
                      <span className="text-slate-600 truncate">{item.label}</span>
                    </td>
                    <td className="py-0.5 sm:py-1 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900">{count}</span>
                        <span className="text-[7px] sm:text-[8px] text-slate-400 font-medium">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-20 flex flex-col gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 text-[8px] sm:text-[10px] text-slate-700 shadow-lg pointer-events-auto max-w-[140px] sm:max-w-none"
        >
          <div className="font-black mb-1 sm:mb-1.5 text-indigo-900 uppercase tracking-wider flex items-center justify-between gap-2 sm:gap-4">
            <span>Legend</span>
            <span className="text-[7px] sm:text-[8px] text-slate-400 font-normal hidden sm:inline">Click color to edit</span>
          </div>
          <div className="flex flex-col gap-1 sm:gap-1.5">
            {[
              { label: 'ITRF with Epoch', status: 'COMPLETE' },
              { label: 'ITRF without Epoch', status: 'NO_EPOCH' },
              { label: 'Missing Info', status: 'MISSING_INFO' },
              { label: 'Local Network', status: 'LOCAL_NETWORK' }
            ].map(item => (
              <div key={item.status} className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer relative">
                 <div className="relative w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0">
                    <input 
                      type="color" 
                      value={statusColors[item.status]} 
                      onChange={(e) => handleColorChange(item.status, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div 
                      className="absolute inset-0 rounded-full border border-white shadow-sm group-hover:scale-110 transition-transform" 
                      style={{ backgroundColor: statusColors[item.status] }} 
                    />
                 </div>
                 <span className="group-hover:text-indigo-600 transition-colors truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const mapRef = useRef<L.Map | null>(null);
  const [countries, setCountries] = useState<CountryData[]>(AFRICA_DATA);
  const [headers, setHeaders] = useState<TableHeaders>({
    country: 'Country',
    formerNetwork: 'Former Network',
    currentNetwork: 'Current Network',
    itrf: 'ITRF',
    epoch: 'Epoch',
    status: 'Status'
  });
  const [africanGeoData, setAfricanGeoData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    itrf: '',
    status: '',
    country: '',
    zone: '',
    epoch: ''
  });

  const filteredData = useMemo(() => {
    return countries.filter(c => {
      const matchesSearch = searchQuery === '' || 
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.itrf.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.currentNetwork && c.currentNetwork.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesItrf = filters.itrf === '' || c.itrf === filters.itrf;
      const matchesStatus = filters.status === '' || c.status === filters.status;
      const matchesCountry = filters.country === '' || c.country.toLowerCase().includes(filters.country.toLowerCase());
      const matchesZone = filters.zone === '' || c.zone === filters.zone;

      const matchesEpoch = filters.epoch === '' || c.epoch === filters.epoch;

      return matchesSearch && matchesItrf && matchesStatus && matchesCountry && matchesZone && matchesEpoch;
    });
  }, [searchQuery, countries, filters]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(response => response.json())
      .then(geoJson => {
        const africanIsoCodes = AFRICA_DATA.map(d => d.id);
        const idMap: Record<string, string> = {
          'SDS': 'SSD', 'SS': 'SSD', 'SZL': 'SWZ', 'ZAR': 'COD', 'DRC': 'COD', 
          'KM': 'COM', 'MU': 'MUS', 'SC': 'SYC', 'CV': 'CPV', 'ST': 'STP', 
          'REU': 'REU', 'MYT': 'COM'
        };
        const africa = {
          ...geoJson,
          features: geoJson.features.filter((f: any) => {
            const id = idMap[f.id] || f.id;
            return africanIsoCodes.includes(id);
          }).map((f: any) => ({
            ...f,
            id: idMap[f.id] || f.id
          }))
        };
        setAfricanGeoData(africa);
      });
  }, []);

  const [isLoading, setIsLoading] = useState(true);

  // Load data from server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          if (data.countries) {
            setCountries(data.countries);
          } else {
            // If server has no data, initialize it with current AFRICA_DATA
            await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ countries: AFRICA_DATA, headers })
            });
          }
          if (data.headers) setHeaders(data.headers);
        }
      } catch (error) {
        console.error("Failed to fetch data from server:", error);
        // Fallback to localStorage if server fails
        const savedData = localStorage.getItem('geodetic_data');
        const savedHeaders = localStorage.getItem('table_headers');
        if (savedData) setCountries(JSON.parse(savedData));
        if (savedHeaders) setHeaders(JSON.parse(savedHeaders));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Persist to localStorage as backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('geodetic_data', JSON.stringify(countries));
    }
  }, [countries, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('table_headers', JSON.stringify(headers));
    }
  }, [headers, isLoading]);

  const handleSaveAll = async () => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries, headers })
      });
      
      if (response.ok) {
        localStorage.setItem('geodetic_data', JSON.stringify(countries));
        localStorage.setItem('table_headers', JSON.stringify(headers));
        alert("All changes have been successfully saved to the database!");
      } else {
        throw new Error("Server response was not ok");
      }
    } catch (error) {
      console.error("Failed to save data to server:", error);
      // Fallback save to localStorage
      localStorage.setItem('geodetic_data', JSON.stringify(countries));
      localStorage.setItem('table_headers', JSON.stringify(headers));
      alert("Error saving to server. Data has been saved locally in your browser.");
    }
  };

  const [showIntro, setShowIntro] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'filter' | 'sources'>('map');
  const [statusColors, setStatusColors] = useState<Record<string, string>>({
    'COMPLETE': '#93c5fd',
    'NO_EPOCH': '#fde047',
    'MISSING_INFO': '#fca5a5',
    'LOCAL_NETWORK': '#c084fc',
    'ACTIVE': '#cbd5e1'
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Partial<CountryData> | null>(null);
  const [editingHeaders, setEditingHeaders] = useState<TableHeaders>(headers);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(countries.map(c => ({
      'Country': c.country,
      'Former Network': c.formerNetwork,
      'Current Network': c.currentNetwork,
      'ITRF': c.itrf,
      'Epoch': c.epoch,
      'Status': c.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Geodetic Data");
    XLSX.writeFile(wb, "Geodesie_Afrique.xlsx");
  };

  const exportMapAsImage = async () => {
    if (mapContainerRef.current === null) return;
    try {
      const dataUrl = await toPng(mapContainerRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = 'Carte_Geodesie_Afrique.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const exportReportPDF = async () => {
    if (mapContainerRef.current === null) return;
    
    // UI Feedback
    alert("Exporting technical report... Please wait.");

    const imageUrlToBase64 = async (url: string): Promise<string | null> => {
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    };

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const getZoneLabel = (z: string) => {
        const zones: Record<string, string> = {
          'NORTH': 'NORTHERN AFRICA', 'SOUTH': 'SOUTHERN AFRICA',
          'EAST': 'EASTERN AFRICA', 'WEST': 'WESTERN AFRICA', 'CENTER': 'CENTRAL AFRICA'
        };
        return zones[z] || z;
      };

      const getStatusLabel = (s: string) => {
        const statuses: Record<string, string> = {
          'COMPLETE': 'ITRF WITH EPOCH', 'NO_EPOCH': 'ITRF WITHOUT EPOCH',
          'MISSING_INFO': 'MISSING INFO', 'LOCAL_NETWORK': 'LOCAL NETWORK'
        };
        return statuses[s] || s.replace('_', ' ');
      };

      const activeFilters = [];
      if (filters.zone) activeFilters.push(getZoneLabel(filters.zone));
      if (filters.status) activeFilters.push(getStatusLabel(filters.status));
      if (filters.itrf) activeFilters.push(`ITRF ${filters.itrf}`);
      
      // If filtering by country text, include countries in title
      if (filters.country) {
        const uniqueCountries = Array.from(new Set(filteredData.map(c => c.country)));
        if (uniqueCountries.length > 0) {
          if (uniqueCountries.length <= 6) {
            activeFilters.push(uniqueCountries.join(' & '));
          } else {
            activeFilters.push(`${uniqueCountries.length} COUNTRIES`);
          }
        }
      }
      
      const reportTitleSuffix = activeFilters.length > 0 ? activeFilters.join(' / ') : 'CONTINENTAL SUMMARY';
      
      const author1 = "Wonbleon Brice Emery PLEI";
      const author2 = "El Hadji Abdoul Aziz SALL";

      // --- HELPER: HEADER/FOOTER ---
      const addPageDecorations = (doc: jsPDF, pageIndex: number, totalPages: number) => {
        doc.setPage(pageIndex);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        
        // Vertical authors in bottom left
        doc.text(author1, 14, pageHeight - 12);
        doc.text(author2, 14, pageHeight - 8);
        
        doc.text(reportTitleSuffix.toUpperCase(), pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`${pageIndex} / ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
        doc.setFillColor(37, 99, 235);
        doc.rect(14, 8, 5, 0.5, 'F');
      };

      // --- MAP CAPTURE LOGIC (ZOOM TO SELECTION FOR REPORT) ---
      let mapDataUrl = "";
      if (mapRef.current && africanGeoData) {
        const currentView = { center: mapRef.current.getCenter(), zoom: mapRef.current.getZoom() };
        
        // Find selection bounds
        const activeIds = filteredData.map(c => c.id);
        const activeFeatures = africanGeoData.features.filter((f: any) => activeIds.includes(f.id));
        
        if (activeFeatures.length > 0) {
          const bounds = L.geoJSON(activeFeatures as any).getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [30, 30], animate: false });
          }
        } else {
          const bounds = L.geoJSON(africanGeoData).getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [10, 10], animate: false });
          }
        }

        // Wait to stabilize
        await new Promise(r => setTimeout(r, 1500));

        try {
          mapDataUrl = await toPng(mapContainerRef.current!, { 
            cacheBust: true, 
            backgroundColor: '#ffffff', 
            width: 1013, 
            height: 635,
            // @ts-ignore
            useCORS: true, 
            pixelRatio: 3, 
            skipFonts: true
          });
        } catch (e) {
          console.error("Map capture failed", e);
        }

        // RESTORE APP VIEW
        mapRef.current.setView(currentView.center, currentView.zoom, { animate: false });
      }

      // 1. --- COVER PAGE ---
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(26, 26, 26);
      doc.text("GEODETIC REFERENCE", pageWidth / 2, 60, { align: 'center' });
      doc.text("FRAMES IN AFRICA", pageWidth / 2, 73, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235);
      doc.text(`TECHNICAL DATA REPORT: ${reportTitleSuffix}`, pageWidth / 2, 85, { align: 'center' });
      
      doc.setDrawColor(240, 240, 240);
      doc.line(30, 95, pageWidth - 30, 95);
      
      if (mapDataUrl) {
        // High-resolution centered map in the report (Format 1013x635)
        const targetW = pageWidth - 20; // Maximum usable width with margins
        const targetH = (635 / 1013) * targetW;
        const mapX = (pageWidth - targetW) / 2;
        doc.addImage(mapDataUrl, 'PNG', mapX, 102, targetW, targetH, undefined, 'FAST');
      }
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text("INSTITUTION", 30, pageHeight - 55);
      doc.setTextColor(26, 26, 26);
      doc.setFont('helvetica', 'bold');
      doc.text("UNIVERSITY IBA DER THIAM OF THIES (UIDT)", 30, pageHeight - 50);
      doc.text("CIVIL ENGINEERING DEPARTMENT (UFR-SI)", 30, pageHeight - 45);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("REPORT DATE", pageWidth - 30, pageHeight - 55, { align: 'right' });
      doc.setTextColor(26, 26, 26);
      doc.setFont('helvetica', 'bold');
      doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth - 30, pageHeight - 50, { align: 'right' });

      // 2. --- TECHNICAL DATA TABLE ---
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(26, 26, 26);
      doc.text("TECHNICAL PARAMETERS SUMMARY", 14, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`Exhaustive technical data for selected African countries.`, 14, 32);

      const tableDataForPDF = await Promise.all(filteredData.map(async (c) => {
        const flagUrl = getFlagUrl(c.id);
        const flagBase64 = flagUrl ? await imageUrlToBase64(flagUrl) : null;
        return { ...c, flagBase64 };
      }));

      autoTable(doc, {
        startY: 40,
        head: [['Flag', 'Country', 'Former Net.', 'Current Net.', 'ITRF', 'Epoch', 'Status']],
        body: tableDataForPDF.map(c => ['', c.country, c.formerNetwork || '---', c.currentNetwork || '---', c.itrf || 'N/A', c.epoch || 'N/A', `    ${getStatusLabel(c.status)}`]), // Added spaces for the dot
        headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        columnStyles: { 
          0: { cellWidth: 12, halign: 'center' }, 
          1: { fontStyle: 'bold', cellWidth: 35 },
          6: { fontStyle: 'bold', cellWidth: 40 }
        },
        didDrawCell: (dataCell: any) => {
          if (dataCell.section === 'body') {
            if (dataCell.column.index === 0) {
              const country = tableDataForPDF[dataCell.row.index];
              if (country.flagBase64) {
                const x = dataCell.cell.x + 2;
                const y = dataCell.cell.y + (dataCell.cell.height - 5.2) / 2;
                try { doc.addImage(country.flagBase64, 'PNG', x, y, 8, 5.2); } catch (e) {}
              }
            } else if (dataCell.column.index === 6) {
              // Add a color dot for the status that matches the current legend
              const country = tableDataForPDF[dataCell.row.index];
              const colorHex = statusColors[country.status] || '#cbd5e1';
              
              // Convert hex to RGB for jsPDF
              const r = parseInt(colorHex.slice(1, 3), 16);
              const g = parseInt(colorHex.slice(3, 5), 16);
              const b = parseInt(colorHex.slice(5, 7), 16);
              
              const x = dataCell.cell.x + 3.5;
              const y = dataCell.cell.y + dataCell.cell.height / 2;
              
              doc.setFillColor(r, g, b);
              doc.circle(x, y, 1.5, 'F');
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.1);
              doc.circle(x, y, 1.5, 'S');
            }
          }
        }
      });

      // Add Disclaimer at the end of the report
      const renderDisclaimer = (yStart: number) => {
        const disclaimerTitle = "KEY INFO : ";
        const disclaimerText = "Some information may be incorrect or outdated. If so, please notify us or update it yourself and let us know.";
        
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        
        const margin = 40;
        const textWidth = pageWidth - (margin * 2);
        const titleWidth = doc.getTextWidth(disclaimerTitle);
        const fullText = disclaimerTitle + disclaimerText;
        const lines = doc.splitTextToSize(fullText, textWidth);
        
        // Center the block
        let currentY = yStart;
        lines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line);
          const xPos = (pageWidth - lineWidth) / 2;
          
          if (index === 0 && line.startsWith(disclaimerTitle)) {
            // Render "KEY INFO :" in red
            doc.setFontSize(12);
            doc.setTextColor(220, 38, 38);
            doc.text(disclaimerTitle, xPos, currentY);
            
            // Render the rest of the first line in gray
            const lineWithoutTitle = line.substring(disclaimerTitle.length);
            doc.setTextColor(107, 114, 128); // slate-500 gray
            doc.text(lineWithoutTitle, xPos + titleWidth, currentY);
          } else {
            // Subsequent lines in gray
            doc.setTextColor(107, 114, 128);
            doc.text(line, xPos, currentY);
          }
          currentY += 6;
        });
        
        doc.setTextColor(0, 0, 0); // Reset color
      };

      const lastY = (doc as any).lastAutoTable?.finalY || 100;
      const disclaimerNeededSpace = 20;
      
      if (lastY + disclaimerNeededSpace > pageHeight - 40) {
        doc.addPage();
        renderDisclaimer(50);
      } else {
        renderDisclaimer(lastY + 25);
      }

      const totalPDFPages = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= totalPDFPages; i++) {
        addPageDecorations(doc, i, totalPDFPages);
      }

      doc.save(`Professional_Geodetic_Report_${reportTitleSuffix.replace(/ \/ /g, '_').replace(/ /g, '_')}.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('An error occurred during report generation.');
    }
  };

  const handleCountrySelect = (country: CountryData | null) => {
    if (selectedCountry && country && selectedCountry.id === country.id) {
      setSelectedCountry(null);
    } else {
      setSelectedCountry(country);
      if (country && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(country.country);
        const voices = window.speechSynthesis.getVoices();
        
        // Try to find an African English voice (South Africa, Nigeria, Kenya etc.)
        const africanVoice = voices.find(v => 
          v.lang.startsWith('en') && 
          (v.lang.includes('ZA') || v.lang.includes('NG') || v.lang.includes('KE') || 
           v.name.toLowerCase().includes('south africa') || v.name.toLowerCase().includes('nigeria') ||
           v.name.toLowerCase().includes('kenya'))
        );
        
        if (africanVoice) {
          utterance.voice = africanVoice;
        } else {
          utterance.lang = 'en-US';
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSaveCountry = () => {
    if (!editingCountry?.id || !editingCountry?.country) {
      alert("ID and country name are required.");
      return;
    }

    const newCountries = [...countries];
    const index = newCountries.findIndex(c => c.id === editingCountry.id);

    if (index > -1) {
      newCountries[index] = editingCountry as CountryData;
    } else {
      newCountries.push(editingCountry as CountryData);
    }

    setCountries(newCountries);
    setIsEditModalOpen(false);
    setEditingCountry(null);
    if (selectedCountry?.id === editingCountry.id) {
      setSelectedCountry(editingCountry as CountryData);
    }
  };

  const handleDeleteCountry = (id: string) => {
    if (window.confirm("Are you sure you want to delete this country?")) {
      setCountries(countries.filter(c => c.id !== id));
      if (selectedCountry?.id === id) setSelectedCountry(null);
    }
  };

  const openEditModal = (country: CountryData | null = null) => {
    setEditingCountry(country ? { ...country } : {
      id: '',
      country: '',
      formerNetwork: '',
      currentNetwork: '',
      itrf: '',
      epoch: '',
      status: 'MISSING_INFO',
      zone: 'WEST'
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-100">
      <AnimatePresence>
        {showIntro && (
          <AfricaIntro onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
              <div id="authors-section" className="text-center lg:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-black uppercase leading-tight"
              >
                PRT M2 - DYNAMICS OF GEODETIC REFERENCE FRAMES IN AFRICA
              </motion.h1>
              <div className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1">
                Interactive Dashboard
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col mt-2 items-center lg:items-start"
              >
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1 text-center lg:text-left">AUTHORS</span>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-slate-600 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600 sm:w-3.5 sm:h-3.5" />
                    <span>Wonbleon Brice Emery PLEI</span>
                  </div>
                  <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-indigo-600 sm:w-3.5 sm:h-3.5" />
                    <span>El Hadji Abdoul Aziz SALL</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            <div className="flex flex-col items-center lg:items-end gap-3">
              <div className="text-center w-full lg:w-auto">
                <span className="text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] bg-slate-50 px-3 py-1 rounded-full border border-slate-100 block lg:inline-block">
                  UNIVERSITÉ IBA DER THIAM DE THIÈS (UFR-SI)
                </span>
              </div>
              <nav className="flex flex-wrap justify-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto">
              <button 
                onClick={() => setActiveTab('map')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'map' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <MapIcon size={16} />
                Map
              </button>
              <button 
                onClick={() => setActiveTab('table')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'table' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <TableIcon size={16} />
                Data
              </button>
              <button 
                onClick={() => setActiveTab('sources')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'sources' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <BookOpen size={16} />
                Sources
              </button>
              <button 
                onClick={() => window.open('https://www.fig.net/searchresults.asp?q=ITRF+SENEGAL+', '_blank')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                )}
              >
                <ExternalLink size={16} />
                FIG Sources
              </button>
              <div className="w-px h-6 bg-slate-200 mx-1 self-center" />
              <button 
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-emerald-600 hover:bg-emerald-50"
                title="Save all changes"
              >
                <Save size={16} />
                Save
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div 
              key="map-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:h-[calc(100vh-180px)]"
            >
              {/* Map Section */}
              <div className="lg:col-span-2 flex flex-col gap-4 h-[500px] sm:h-[600px] lg:h-full">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <Filter size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone:</span>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>

                  <button 
                    onClick={exportReportPDF}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                  >
                    <FileText size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export Report (PDF)</span>
                    <span className="sm:hidden">Report</span>
                  </button>
                  
                  <button 
                    onClick={exportMapAsImage}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95 ml-auto"
                  >
                    <Download size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export Map Image (PNG)</span>
                    <span className="sm:hidden">Export</span>
                  </button>
                </div>
                <div className="relative flex-1" ref={mapContainerRef}>
                  <AfricaMap 
                    onCountryClick={handleCountrySelect} 
                    selectedCountryId={selectedCountry?.id || null} 
                    data={filteredData}
                    headers={headers}
                    setEditingHeaders={setEditingHeaders}
                    setIsHeaderModalOpen={setIsHeaderModalOpen}
                    statusColors={statusColors}
                    setStatusColors={setStatusColors}
                    mapRef={mapRef}
                    africanGeoData={africanGeoData}
                  />
                </div>
              </div>

              {/* Info Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Info size={18} className="text-indigo-600" />
                    Country Details
                  </h2>
                  {selectedCountry && (
                    <button 
                      onClick={() => setSelectedCountry(null)}
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  {selectedCountry ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-sm",
                          selectedCountry.status === 'COMPLETE' ? "bg-blue-50 text-blue-600" :
                          selectedCountry.status === 'NO_EPOCH' ? "bg-yellow-50 text-yellow-600" :
                          selectedCountry.status === 'MISSING_INFO' ? "bg-red-50 text-red-600" :
                          selectedCountry.status === 'LOCAL_NETWORK' ? "bg-purple-50 text-purple-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight flex items-center gap-2">
                            {getFlagUrl(selectedCountry.id) && (
                              <img 
                                src={getFlagUrl(selectedCountry.id)!} 
                                alt="" 
                                className="w-6 h-auto rounded-sm shadow-sm border border-slate-100"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {selectedCountry.country}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full",
                              selectedCountry.status === 'COMPLETE' ? "bg-blue-100 text-blue-700" :
                              selectedCountry.status === 'NO_EPOCH' ? "bg-yellow-100 text-yellow-700" :
                              selectedCountry.status === 'MISSING_INFO' ? "bg-red-100 text-red-700" :
                              selectedCountry.status === 'LOCAL_NETWORK' ? "bg-purple-100 text-purple-700" :
                              "bg-slate-100 text-slate-700"
                            )}>
                              {selectedCountry.status.replace('_', ' ')}
                            </span>
                            <div className="flex gap-1 ml-auto">
                              <button 
                                onClick={() => openEditModal(selectedCountry)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCountry(selectedCountry.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <InfoItem label={headers.formerNetwork} value={selectedCountry.formerNetwork} />
                        <InfoItem label={headers.currentNetwork} value={selectedCountry.currentNetwork} />
                        <InfoItem label={headers.itrf} value={selectedCountry.itrf} />
                        <InfoItem label={headers.epoch} value={selectedCountry.epoch} />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <MapIcon size={32} className="text-slate-400" />
                      </div>
                      <p className="text-sm max-w-[200px] text-slate-500">
                        Click on a country on the map to see detailed information
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'table' && (
            <motion.div 
              key="table-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <BarChart3 size={16} className="text-indigo-600 sm:w-5 sm:h-5" />
                    Filtered Statistics
                  </h3>
                  <div className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Based on {filteredData.length} countries
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {[
                    { label: 'ITRF with Epoch', status: 'COMPLETE' },
                    { label: 'ITRF without Epoch', status: 'NO_EPOCH' },
                    { label: 'Missing Info', status: 'MISSING_INFO' },
                    { label: 'Local Network', status: 'LOCAL_NETWORK' }
                  ].map((item) => {
                    const count = filteredData.filter(c => c.status === item.status).length;
                    const percentage = filteredData.length > 0 ? ((count / filteredData.length) * 100).toFixed(1) : 0;
                    const color = statusColors[item.status] || '#cbd5e1';
                    return (
                      <div 
                        key={item.status} 
                        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all"
                        style={{ 
                          backgroundColor: `${color}15`, // Light opacity
                          borderColor: `${color}40`,
                          color: color === '#fde047' ? '#a16207' : color // Darker for yellow text
                        }}
                      >
                        <div className="text-[7px] sm:text-[10px] font-black uppercase tracking-wider mb-1 opacity-70 truncate">{item.label}</div>
                        <div className="flex items-end gap-1 sm:gap-2">
                          <span className="text-lg sm:text-2xl font-black leading-none" style={{ color }}>{count}</span>
                          <span className="text-[8px] sm:text-xs font-bold opacity-60 mb-0.5">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Filter size={20} className="text-indigo-600" />
                    Advanced Filters
                  </h3>
                  <button 
                    onClick={() => setFilters({ itrf: '', status: '', country: '', zone: '', epoch: '' })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    Reset Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        value={filters.country}
                        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                        placeholder="Search country..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ITRF Frame</label>
                    <select 
                      value={filters.itrf}
                      onChange={(e) => setFilters({ ...filters, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Frames</option>
                      {Array.from(new Set(countries.map(c => c.itrf).filter(Boolean))).sort().map(itrf => (
                        <option key={itrf} value={itrf}>{itrf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Zone</label>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epoch</label>
                    <select 
                      value={filters.epoch}
                      onChange={(e) => setFilters({ ...filters, epoch: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Epochs</option>
                      {Array.from(new Set(countries.map(c => c.epoch).filter(Boolean))).sort().map(epoch => (
                        <option key={epoch} value={epoch}>{epoch}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-bold text-slate-900">{filteredData.length}</span> countries
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                  >
                    <Download size={16} />
                    Export Excel
                  </button>
                  <button 
                    onClick={() => {
                      setEditingHeaders(headers);
                      setIsHeaderModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Settings size={16} />
                    Edit Headers
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.country}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.formerNetwork}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.currentNetwork}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.itrf}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.epoch}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{headers.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.map((country) => (
                        <tr 
                          key={country.id}
                          className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          onClick={() => {
                            handleCountrySelect(country);
                            setActiveTab('map');
                          }}
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            <div className="flex items-center gap-2">
                              {getFlagUrl(country.id) && (
                                <img 
                                  src={getFlagUrl(country.id)!} 
                                  alt="" 
                                  className="w-5 h-auto rounded-sm border border-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              {country.country}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.formerNetwork || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {country.currentNetwork || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-indigo-600">
                            {country.itrf || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-amber-600">
                            {country.epoch || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] uppercase font-black tracking-tighter px-2 py-1 rounded-md",
                              country.status === 'COMPLETE' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              country.status === 'NO_EPOCH' ? "bg-yellow-50 text-yellow-600 border border-yellow-100" :
                              country.status === 'MISSING_INFO' ? "bg-red-50 text-red-600 border border-red-100" :
                              country.status === 'LOCAL_NETWORK' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                              "bg-slate-50 text-slate-600 border border-slate-100"
                            )}>
                              {country.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'filter' && (
            <motion.div 
              key="filter-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                      <Filter className="text-indigo-600" />
                      Advanced Filtering
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Refine the data displayed in the table and map</p>
                  </div>
                  <button 
                    onClick={() => setFilters({ itrf: '', status: '', country: '', zone: '', epoch: '' })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    Reset All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Country Name</label>
                    <input 
                      type="text" 
                      value={filters.country}
                      onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                      placeholder="e.g., Senegal, Morocco..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by ITRF Frame</label>
                    <select 
                      value={filters.itrf}
                      onChange={(e) => setFilters({ ...filters, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All ITRF Frames</option>
                      {Array.from(new Set(countries.map(c => c.itrf).filter(Boolean))).sort().map(itrf => (
                        <option key={itrf} value={itrf}>{itrf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Status</label>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Zone</label>
                    <select 
                      value={filters.zone}
                      onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="">All Zones</option>
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                </div>

                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={() => setActiveTab('table')}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                  >
                    Apply Filters & View Results ({filteredData.length} countries)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sources' && (
            <motion.div 
              key="sources-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-slate-200">
                  <BookOpen size={200} />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <BookOpen className="text-indigo-600" />
                  Technical Sources & Documentation
                </h2>
                
                <div className="prose prose-slate max-w-none space-y-8 text-slate-600">
                  <p className="text-lg">
                    This dashboard is built upon a compilation of technical data from international geodetic services and specialized research. Below are the primary sources and interactive documents used for this project.
                  </p>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Source Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">Notebook 1</td>
                          <td className="px-6 py-4 text-sm">Comprehensive geodetic data compilation and analysis for African reference frames.</td>
                          <td className="px-6 py-4">
                            <a 
                              href="https://notebooklm.google.com/notebook/574afb8b-3d81-43b8-979d-817da2fa56b5?authuser=1" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                            >
                              <ExternalLink size={14} />
                              Open Notebook
                            </a>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">Notebook 2</td>
                          <td className="px-6 py-4 text-sm">Extended documentation on ITRF standards and regional geodetic dynamics.</td>
                          <td className="px-6 py-4">
                            <a 
                              href="https://notebooklm.google.com/notebook/7168590f-d36f-426b-9f54-382eea234d8b?authuser=1" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                            >
                              <ExternalLink size={14} />
                              Open Notebook
                            </a>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">FIG Search Results</td>
                          <td className="px-6 py-4 text-sm">International Federation of Surveyors (FIG) database for ITRF in Senegal and Africa.</td>
                          <td className="px-6 py-4">
                            <a 
                              href="https://www.fig.net/searchresults.asp?q=ITRF+SENEGAL+" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                            >
                              <ExternalLink size={14} />
                              Search FIG
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                        <ChevronRight size={18} className="text-indigo-600" />
                        Primary Data Sources
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>AFREF (African Reference Frame) technical reports</li>
                        <li>IERS (International Earth Rotation and Reference Systems Service)</li>
                        <li>National geographic services of African countries</li>
                        <li>Inventory of CORS (Continuously Operating Reference Stations)</li>
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                        <ChevronRight size={18} className="text-indigo-600" />
                        Methodology
                      </h3>
                      <p className="text-sm">
                        The classification is based on the simultaneous availability of a recent ITRF frame and a valid reference epoch, crucial elements for dynamic geodetic accuracy.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Developed by</p>
                    <p className="text-slate-900 font-medium">Wonbleon Brice Emery PLEI & El Hadji Abdoul Aziz SALL</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Globe size={24} />
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Info size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isEditModalOpen && editingCountry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Edit2 size={20} className="text-indigo-600" />
                  {editingCountry.id ? "Edit Country" : "Add Country"}
                </h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ISO Code (ID)</label>
                    <input 
                      type="text" 
                      value={editingCountry.id || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, id: e.target.value.toUpperCase() })}
                      disabled={!!countries.find(c => c.id === editingCountry.id) && countries.findIndex(c => c.id === editingCountry.id) !== -1}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      placeholder="e.g., SEN"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.country}</label>
                    <div className="relative">
                      {editingCountry.id && getFlagUrl(editingCountry.id) && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <img 
                            src={getFlagUrl(editingCountry.id)!} 
                            alt="" 
                            className="w-5 h-auto rounded-sm border border-slate-100"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <input 
                        type="text" 
                        value={editingCountry.country || ''}
                        onChange={(e) => setEditingCountry({ ...editingCountry, country: e.target.value })}
                        className={cn(
                          "w-full bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none",
                          editingCountry.id && getFlagUrl(editingCountry.id) ? "pl-10 pr-4" : "px-4"
                        )}
                        placeholder="e.g., Senegal"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.formerNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.formerNetwork || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, formerNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.currentNetwork}</label>
                  <input 
                    type="text" 
                    value={editingCountry.currentNetwork || ''}
                    onChange={(e) => setEditingCountry({ ...editingCountry, currentNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.itrf}</label>
                    <input 
                      type="text" 
                      value={editingCountry.itrf || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, itrf: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.epoch}</label>
                    <input 
                      type="text" 
                      value={editingCountry.epoch || ''}
                      onChange={(e) => setEditingCountry({ ...editingCountry, epoch: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{headers.status}</label>
                    <select 
                      value={editingCountry.status || 'MISSING_INFO'}
                      onChange={(e) => setEditingCountry({ ...editingCountry, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="COMPLETE">ITRF with Epoch</option>
                      <option value="NO_EPOCH">ITRF without Epoch</option>
                      <option value="MISSING_INFO">Missing Information</option>
                      <option value="LOCAL_NETWORK">Local Network</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone</label>
                    <select 
                      value={editingCountry.zone || 'WEST'}
                      onChange={(e) => setEditingCountry({ ...editingCountry, zone: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="NORTH">NORTH</option>
                      <option value="SOUTH">SOUTH</option>
                      <option value="EAST">EAST</option>
                      <option value="WEST">WEST</option>
                      <option value="CENTER">CENTER</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCountry}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Edit Modal */}
      <AnimatePresence>
        {isHeaderModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  Edit Table Headers
                </h2>
                <button 
                  onClick={() => setIsHeaderModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.country}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, country: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Former Network Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.formerNetwork}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, formerNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Network Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.currentNetwork}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, currentNetwork: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ITRF Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.itrf}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, itrf: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Epoch Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.epoch}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, epoch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Column</label>
                  <input 
                    type="text" 
                    value={editingHeaders.status}
                    onChange={(e) => setEditingHeaders({ ...editingHeaders, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsHeaderModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setHeaders(editingHeaders);
                    setIsHeaderModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save Headers
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-100 text-center text-slate-400 text-xs">
        <p>© 2026 DYNAMIC GEODETIC REFERENCE FRAMES IN AFRICA</p>
        <p className="mt-1">Interactive visualization of continental geodetic data</p>
      </footer>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-all group shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className={cn(
        "text-sm font-medium",
        value ? "text-slate-800" : "text-slate-400 italic"
      )}>
        {value || "Not specified"}
      </p>
    </div>
  );
}
