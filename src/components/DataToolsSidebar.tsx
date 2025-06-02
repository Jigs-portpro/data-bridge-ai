
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
  Github,
  LogOut,
  Settings, // Added Settings icon
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import Link from 'next/link'; // Added Link for navigation


const toolConfig = [
  { name: 'Data Correction', id: 'correction', icon: Wand2, description: 'Suggest casing & format fixes' },
  { name: 'Data Enrichment', id: 'enrichment', icon: Sparkles, description: 'Add new data or insights' },
  { name: 'Column Reorder', id: 'reorder', icon: Shuffle, description: 'Intelligently reorder columns' },
  { name: 'Anomaly Report', id: 'anomaly', icon: Siren, description: 'Identify potential anomalies' },
  { name: 'Duplicate Detection', id: 'duplicate', icon: CopyCheck, description: 'Find and flag duplicates' },
];

export function DataToolsSidebar() {
  const { openDialog, data, isAuthenticated, logout } = useAppContext();
  const isDataLoaded = data.length > 0;

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-4">
          <Link href="/" passHref>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center cursor-pointer">
              <LogoIcon className="w-8 h-8 text-primary group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6 transition-all" />
              <h1 className="text-2xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">DataWise AI</h1>
            </div>
          </Link>
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
                                disabled={!isDataLoaded || !isAuthenticated}
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
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Application</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/setup" passHref legacyBehavior>
                                <SidebarMenuButton
                                    disabled={!isAuthenticated}
                                    tooltip={{children: "Setup Entities", side:"right", align:"center"}}
                                    className="justify-start"
                                    asChild // Important for Link to work with Button styling
                                >
                                   <a>
                                    <Settings className="h-5 w-5" />
                                    <span className="group-data-[collapsible=icon]:hidden">Setup</span>
                                   </a>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto group-data-[collapsible=icon]:p-2">
            {isAuthenticated && (
              <>
                <Button variant="ghost" onClick={logout} className="w-full justify-start group-data-[collapsible=icon]:justify-center mb-2">
                    <LogOut className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden ml-2">Logout</span>
                </Button>
                <SidebarSeparator className="my-1 group-data-[collapsible=icon]:mx-0"/>
              </>
            )}
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
