"use client";

import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { LogoIcon } from '@/components/icons/LogoIcon';
import {
  Wand2,
  Sparkles,
  Shuffle,
  Siren,
  CopyCheck,
  MessageCircle,
  Github,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';


const toolConfig = [
  { name: 'Data Correction', id: 'correction', icon: Wand2, description: 'Suggest casing & format fixes' },
  { name: 'Data Enrichment', id: 'enrichment', icon: Sparkles, description: 'Add new data or insights' },
  { name: 'Column Reorder', id: 'reorder', icon: Shuffle, description: 'Intelligently reorder columns' },
  { name: 'Anomaly Report', id: 'anomaly', icon: Siren, description: 'Identify potential anomalies' },
  { name: 'Duplicate Detection', id: 'duplicate', icon: CopyCheck, description: 'Find and flag duplicates' },
];

export function DataToolsSidebar() {
  const { openDialog, data } = useAppContext();
  const isDataLoaded = data.length > 0;

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <LogoIcon className="w-8 h-8 text-primary group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all" />
            <h1 className="text-2xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">DataWise AI</h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">AI Tools</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {toolConfig.map((tool) => (
                            <SidebarMenuItem key={tool.id}>
                            <SidebarMenuButton
                                onClick={() => openDialog(tool.id)}
                                disabled={!isDataLoaded}
                                tooltip={{children: tool.name, side:"right", align:"center"}}
                                className="justify-start"
                            >
                                <tool.icon className="h-5 w-5" />
                                <span className="group-data-[collapsible=icon]:hidden">{tool.name}</span>
                            </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto group-data-[collapsible=icon]:p-2">
            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center" asChild>
                <a href="https://github.com/firebase/genkit/tree/main/studio" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">View on GitHub</span>
                </a>
            </Button>
        </SidebarFooter>
      </Sidebar>
  );
}
