import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";

export const useConvexQuery = (query, ...args) => {
    const result = useQuery(query, ...args);

    const [data, setData] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (result === undefined) {
            setIsLoading(true);
        } else {
            try {
                setData(result);
                setError(null);
            } catch (err) {
                setError(err);
                toast.error(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    }, [result]);

    return {
        data,
        isLoading,
        error,
    };
};

export const useConvexMutation = (mutation) => {
    const MutationFn = useMutation(mutation);

    const [data, setData] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const mutate = async (...args) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await MutationFn(...args);
            setData(response);
            return response;
        } catch (err) {
            setError(err);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return { 
        mutate, 
        data, 
        isLoading, 
        error 
    }
};