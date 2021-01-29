#!/bin/bash
# Declaring the modified Specs
podspec=nfs-sharedv4-pod.yaml
storageclassspec=nfs-sharedv4-sc.yaml
pvcspec=nfs-sharedv4-pvc.yaml

# Check if Storage Class is already present and create PVC, else create it and then create PVC.
if kubectl get sc export-sharedv4-sc
then
    echo ""
   if kubectl get pvc export-sharedv4-pvc
    then
            pvc_id=$(kubectl get pvc export-sharedv4-pvc | grep -v STATUS | awk '{print $3}')               
    else 
                 {
            pvc_id=$(kubectl apply -f $pvcspec | awk '{print $1}'| cut -d "/" -f 2)
                 }
     fi
else
        kubectl apply -f $storageclassspec
        pvc_id=$(kubectl apply -f $pvcspec | awk '{print $1}'| cut -d "/" -f 2)
fi        
        while [ $(kubectl get pvc export-sharedv4-pvc | grep -v NAME | awk '{print $2}') != 'Bound'  ]
        do 
                    sleep 3
                    echo "Waiting for PVC $pvc_id to get Bound !"
            done
            echo ""
            echo " The export-sharedv4-pvc is now in Bound State ... "

    pods=$(kubectl get pods -l name=portworx -n kube-system -o jsonpath='{.items[0].metadata.name}')
    vol_id=$(kubectl exec $pods -n kube-system -- /opt/pwx/bin/pxctl v i $pvc_id| grep -i "Device" |awk '{print $4}'|cut -b 13-)
    kubectl apply -f $podspec
    echo ""
    while [ $(kubectl get pods | grep export-sharedv4-pod | awk '{print $3}') != 'Running'  ]
    do
            sleep 3
            echo " The pod export-sharedv4-pod is NOT Running yet ..."
    done
    echo ""
    # Capture the NFS endpoint ..
    target_nfs_ep=$(kubectl get nodes $(kubectl get pods -o wide | grep export-sharedv4-pod | awk '{print $7}') -o wide | awk '{print $6}' | grep -v INTERNAL-IP)
    echo " TARGET NFS END-POINT: $target_nfs_ep"
    # Capture exported NFS Sharedv4 Volume device PATH
    nfs_path=$(showmount -e $target_nfs_ep |grep -i $vol_id | awk '{print $1}')
    echo " TARGET NFS DEVICE PATH: $nfs_path"
    # Mount the nfs endpoint
    echo ""
    echo "Use the following information and commands to mount the sharedv4 Portworx volume:- "
    echo ""
    echo "  1. Create a mount point directory for example, mkdir /mnt/Portworx_NFS_Mount"
    echo "  2. mount -t nfs" $target_nfs_ep:$nfs_path /mnt/Portworx_NFS_Mount
    echo "  3. Verify mount df -hP /mnt/Portworx_NFS_Mount"
    echo ""
    