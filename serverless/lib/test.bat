if[[$# -ge 2]]; then
    export CDK_DEPLOY_ACCOUNT=$1
    export CDK_DEPLOY_ACCOUNT=$2
    shift; shift
    npx cdk deploy "$@"
    exit $?
else
    echo 1>&2 "Enter Account & Region"
    echo 1>&2 "Addtional args pased to CDK"
    exit 1
fi    



