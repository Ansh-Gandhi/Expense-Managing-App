"use client";

import React, { useState } from "react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { BarLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { Plus, User, Users } from "lucide-react";

const ContactsPage = () => {
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const { data, isLoading } = useConvexQuery(api.contacts.getAllContacts);

    if (isLoading) {
        return (
            <div className="container mx-auto py-12">
                <BarLoader width="100%" color="#36d7b7" />
            </div>
        );
    }

    const { users, groups } =  data || { users: [], groups: [] };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center justify-between">
                <h1 className="gradient-title text-5xl">Contacts</h1>
                <Button onClick={() => setIsCreateGroupModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                    Create Group
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        People
                    </h2>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Groups
                    </h2>
                </div>  
            </div>
        </div>
    )
};

export default ContactsPage;