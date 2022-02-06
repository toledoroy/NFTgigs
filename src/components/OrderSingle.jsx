import React, { useState, useEffect, useContext } from 'react';
// import { Link } from "react-router-dom";
import { Button, Input, InputNumber, Form, Radio } from "antd";
// import { OfferContractContext } from "context/context";
import { useOffer } from "hooks/useOffer";
// import { useIPFS } from "hooks/useIPFS";
import { useMoralis, useMoralisQuery } from "react-moralis";


/**
 * Single Order Page
 */
function OrderSingle(props) {
    const { token_id, order_id } = props.match.params;
    const { Moralis, account, isInitialized, isWeb3Enabled } = useMoralis();
    const {
        saveJSONToIPFS,
        deliver, approve,
        getPrice, getSupply, getCredit, getStatus, getCreator
    } = useOffer();

    const [metadata, setMetadata] = useState();
    const [order, setOrder] = useState({});

    //TODO: Make this into a hook
    const [price, setPrice] = useState();
    const [stock, setStock] = useState();
    const [credit, setCredit] = useState();
    const [creator, setCreator] = useState();
    const [status, setStatus] = useState();
    const [isSeller, setIsSeller] = useState();
    const [isBuyer, setIsBuyer] = useState();
    useEffect(() => {
        if (isWeb3Enabled) loadOnChainData();
    }, [isWeb3Enabled, account, token_id, order_id]);
    const loadOnChainData = async () => {
        const query = new Moralis.Query("mumbaiOfferOrderd").equalTo("token_id", token_id).equalTo("order_id", order_id);
        query.first().then(order => {
            console.warn("[DEV] OrderSingle: ", order?.attributes);
            setOrder(order);
            setIsBuyer(order.get('account') === account);
        });
        //Fetch onChain Data
        getPrice(token_id).then(res => setPrice(res));
        getSupply(token_id).then(res => setStock(res));
        getCredit(account, token_id).then(res => setCredit(res));
        getStatus(token_id, order_id, true).then(res => setStatus(res));
        getCreator(token_id).then(res => {
            setCreator(res.toLowerCase());
            setIsSeller(res.toLowerCase() === account)
        });
    };

    /**
     * Submit Approval Form
     * @param {*} values 
     */
    const onFinishReview = async (values) => {

    }
    return (
        <div className="framed offer order">
            <h1>Order {'G' + token_id + 'G' + order_id}</h1>
            <h3>Status: {status}</h3>


            {(status === 'requested') && <>
                {isSeller
                    ? <div className='block'>
                        <h2>Deliver</h2>
                        <div className='order-delivery'>
                            <Input.TextArea
                                placeholder={"Delivery Note"}
                                autoSize={{ minRows: 6, maxRows: 6 }}
                                onChange={(evt) => setMetadata(evt.target.value)}
                            />
                            <div>[Potential Image/File Upload]</div>
                            <Button default onClick={async () => {
                                //Save to IPFS & Register Delivery URI to the Contract
                                let delivery_uri = await saveJSONToIPFS(metadata);
                                deliver(token_id, order_id, delivery_uri);
                            }} disabled={!isSeller}>Deliver</Button>
                        </div>
                    </div>
                    : <div className='block'>Awaiting Delivery</div>}
            </>}

            {(status === 'delivered') && <>
                {isBuyer
                    ? <div className='block'>
                        <h2>Approval Stage</h2>
                        <div className='order-delivery'>
                            <h3>Review</h3>
                            <Form
                                name="reviewForm"
                                id="reviewForm"
                                onFinish={onFinishReview}
                                onFinishFailed={console.error}
                                labelCol={{ span: 8 }}
                                wrapperCol={{ span: 16 }}
                                labelWrap={false}
                                // initialValues={{name: "name",}}
                                autoComplete="off"
                            >
                                <Form.Item
                                    key={"review"}
                                    name={"review"}
                                    label={"Review"}
                                // rules={field.rules}
                                >
                                    <Input.TextArea
                                        placeholder={"Tell others about your experience"}
                                        autoSize={{ minRows: 4, maxRows: 6 }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    key={"rating"}
                                    name={"rating"}
                                    label={"Rate"}
                                    style={{ display: 'flex' }}
                                // rules={field.rules}
                                >
                                    <Radio.Group buttonStyle="solid" size={'small'}>
                                        <Radio.Button value="1">1</Radio.Button>
                                        <Radio.Button value="2">2</Radio.Button>
                                        <Radio.Button value="3">3</Radio.Button>
                                        <Radio.Button value="4">4</Radio.Button>
                                        <Radio.Button value="5">5</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                                <Form.Item>
                                    <Button type="primary" htmlType="submit">
                                        Submit
                                    </Button>
                                </Form.Item>
                            </Form>

                        </div>
                    </div>
                    : <div className='block'>Awaiting Approval</div>}
            </>}
        </div>
    );

} //OrderSingle()

export default OrderSingle;