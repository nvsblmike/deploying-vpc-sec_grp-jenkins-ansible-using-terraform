'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationSettings } from './settings/LocationSettings';
import { WorkingHoursSettings } from './settings/WorkingHoursSettings';

export function Settings() {
  const [activeTab, setActiveTab] = useState('locations');

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your attendance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
            </TabsList>
            <TabsContent value="locations" className="mt-4">
              <LocationSettings />
            </TabsContent>
            <TabsContent value="working-hours" className="mt-4">
              <WorkingHoursSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
